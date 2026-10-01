import React, { useState } from 'react';
import {
  Hash,
  Plus,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ onOpenSettings }) {
  const {
    currentWorkspace,
    channels = [],
    activeChannel,
    selectChannel,
    allWorkspaceParticipants = [],
    adminProfile,
    activeDM,
    openDM,
    createChannel,
    unreadCounts = {},
  } = useWorkspace();

  const { user } = useAuth();

  // Permissions: System Admin and Workspace Admin can create channels
  const isSystemAdmin = user?.email?.toLowerCase() === 'admin@connectteams.com';
  const isWorkspaceAdmin = !isSystemAdmin && user?.role === 'admin';
  const canManageChannels = isSystemAdmin || isWorkspaceAdmin;

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    if (!canManageChannels) return;

    const cleanName = newChannelName
      .trim()
      .toLowerCase()
      .replace(/^[#\s\-_]+/, '')
      .replace(/[#\s\-_]+$/, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!cleanName) return;

    if (createChannel) {
      await createChannel(cleanName);
    }
    setNewChannelName('');
    setIsCreatingChannel(false);
  };

  const currentEmail = (user?.email || '').toLowerCase();

  return (
    <aside className="w-60 h-screen flex flex-col bg-[#F5F3EF] dark:bg-[#18181B] border-r border-stone-200 dark:border-zinc-800/80 shrink-0 select-none transition-colors">
      {/* Workspace Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800/80">
        <button className="flex items-center space-x-1.5 font-semibold text-sm text-stone-900 dark:text-zinc-100 hover:opacity-80 truncate">
          <span className="truncate">{currentWorkspace?.name || 'Acme Engineering'}</span>
          <ChevronDown size={14} className="text-stone-400 shrink-0" />
        </button>
        <button
          onClick={onOpenSettings}
          title="Workspace Settings"
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 dark:text-zinc-500">
              Channels
            </span>
            {canManageChannels && (
              <button
                onClick={() => setIsCreatingChannel((prev) => !prev)}
                title="Create Channel"
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {canManageChannels && isCreatingChannel && (
            <form onSubmit={handleCreateChannelSubmit} className="px-2 mb-2">
              <input
                type="text"
                autoFocus
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="channel-name"
                className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </form>
          )}

          <div className="space-y-0.5">
            {(channels || []).map((ch) => {
              const isActive = activeChannel?.id === ch.id;
              const hasUnread = !isActive && !!unreadCounts[String(ch.id)];

              return (
                <button
                  key={ch.id}
                  onClick={() => selectChannel && selectChannel(ch)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-stone-200/70 text-stone-900 dark:bg-zinc-800/80 dark:text-zinc-100 font-semibold'
                      : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/40 dark:hover:bg-zinc-800/40 hover:text-stone-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Hash size={14} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </div>

                  {hasUnread && (
                    <span
                      title="Unread messages"
                      className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse shadow-xs"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section - Strict Double Click */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 dark:text-zinc-500">
              Direct Messages ({allWorkspaceParticipants.length})
            </span>
          </div>

          <div className="space-y-0.5">
            {allWorkspaceParticipants.map((member) => {
              const memberEmail = (member.email || '').toLowerCase();
              const isCurrentUser = memberEmail === currentEmail;
              const isDMOpen = activeDM && (activeDM.email || '').toLowerCase() === memberEmail;

              const isMemberSystemAdmin = memberEmail === 'admin@connectteams.com';
              const memberName = isMemberSystemAdmin
                ? adminProfile?.full_name || 'System Admin'
                : member.full_name;

              const displayName = isCurrentUser ? `${memberName} (you)` : memberName;

              const dmKey = isCurrentUser
                ? `dm_self_${currentEmail}`
                : `dm_${[currentEmail, memberEmail].sort().join('__')}`;

              const unreadCount = (!isDMOpen && unreadCounts[dmKey]) || 0;

              return (
                <button
                  key={member.id || member.email}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (openDM) {
                      openDM(
                        isMemberSystemAdmin ? { ...member, full_name: memberName } : member,
                        currentEmail
                      );
                    }
                  }}
                  title="Double-click to open DM"
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                    isDMOpen
                      ? 'bg-stone-200/70 text-stone-900 dark:bg-zinc-800/80 dark:text-zinc-100 font-semibold ring-1 ring-stone-300 dark:ring-zinc-700'
                      : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/40 dark:hover:bg-zinc-800/40 hover:text-stone-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        member.is_online !== false ? 'bg-emerald-500' : 'bg-stone-400 dark:bg-zinc-600'
                      }`}
                    />
                    <span className="truncate">{displayName}</span>

                    {/* System Admin Badge */}
                    {isMemberSystemAdmin && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                        System Admin
                      </span>
                    )}

                    {/* Member Admin Badge */}
                    {!isMemberSystemAdmin && member.role === 'admin' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                        admin
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <span
                      title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                      className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-pulse shadow-sm shadow-red-500/50"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Profile Footer */}
      <div className="p-3 border-t border-stone-200 dark:border-zinc-800/80 flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-stone-800 dark:text-zinc-200 shrink-0">
          {(isSystemAdmin ? adminProfile?.full_name || 'S' : user?.full_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate flex items-center space-x-1.5">
            <span className="truncate">
              {isSystemAdmin ? adminProfile?.full_name || 'System Admin' : user?.full_name || 'User'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
              isSystemAdmin
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium'
                : user?.role === 'admin'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}>
              {isSystemAdmin
                ? 'System Admin'
                : user?.role === 'admin'
                ? `${(user?.email || '').split('@')[0]}-admin`
                : 'Member'}
            </span>
          </p>
          <p className="text-[10px] text-stone-400 dark:text-zinc-500 truncate">
            {user?.email}
          </p>
        </div>
      </div>
    </aside>
  );
}