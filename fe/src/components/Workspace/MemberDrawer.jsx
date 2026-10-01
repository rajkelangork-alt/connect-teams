import React, { useState } from 'react';
import { X, Search, Shield, User, MessageCircle, UserPlus, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

export default function MemberDrawer({ isOpen, onClose }) {
  const { currentWorkspace, members = [], globalMembers = [], addMemberToWorkspace, selectDM } = useWorkspace();
  const { user: currentUser, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteStatus, setInviteStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleAddTeammate = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setErrorMessage('');

    let clean = inviteUsername.trim().toLowerCase();
    if (!clean.includes('@')) {
      clean = `${clean}@connectteams.com`;
    }

    const result = await addMemberToWorkspace(clean, inviteName, inviteRole);

    if (!result?.success) {
      setErrorMessage(result?.error || 'Failed to add member.');
      return;
    }

    setInviteStatus('Added to workspace!');
    setInviteUsername('');
    setInviteName('');
    setTimeout(() => {
      setInviteStatus('');
      setIsAddingMember(false);
    }, 1200);
  };

  const filteredMembers = (members || []).filter((m) => {
    const name = (m.full_name || m.name || m.email || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const onlineCount = filteredMembers.filter((m) => m.is_online !== false).length;

  return (
    <aside className="w-80 md:w-88 h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#121214] border-l border-stone-200 dark:border-zinc-800 shrink-0 transition-colors z-30 shadow-xl">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <User size={16} className="text-stone-500 dark:text-zinc-400" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Members ({filteredMembers.length})
          </h3>
        </div>

        <div className="flex items-center space-x-1">
          {isAdmin && (
            <button
              onClick={() => {
                setErrorMessage('');
                setIsAddingMember((prev) => !prev);
              }}
              title="Add teammate (Admin only)"
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Admin Invite Form */}
      {isAdmin && isAddingMember && (
        <form
          onSubmit={handleAddTeammate}
          className="p-3 bg-stone-100/90 dark:bg-zinc-800/80 border-b border-stone-200 dark:border-zinc-700/80 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-900 dark:text-zinc-200">
              Add Member ({globalMembers.length}/7 capacity)
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              required
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="username (e.g. dev)"
              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <span className="absolute right-2.5 top-1.5 text-[10px] text-stone-400">@connectteams.com</span>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full Name"
              className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="text-xs px-2 py-1.5 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin Badge</option>
            </select>
          </div>

          {errorMessage && (
            <p className="text-[11px] text-red-500 font-medium leading-tight">{errorMessage}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {inviteStatus && (
                <span className="inline-flex items-center space-x-1">
                  <Check size={12} />
                  <span>{inviteStatus}</span>
                </span>
              )}
            </span>
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-2.5 py-1 text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:opacity-90 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Input */}
      <div className="p-3 border-b border-stone-200/70 dark:border-zinc-800/70">
        <div className="flex items-center space-x-2 bg-stone-100 dark:bg-zinc-800/60 rounded-lg px-2.5 py-1.5 border border-stone-200 dark:border-zinc-700/60 focus-within:ring-1 focus-within:ring-stone-400 dark:focus-within:ring-zinc-600">
          <Search size={14} className="text-stone-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter workspace members..."
            className="w-full text-xs bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Tally */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500 border-b border-stone-100 dark:border-zinc-800/40">
        <span>{onlineCount} online</span>
        <span>{filteredMembers.length - onlineCount} offline</span>
      </div>

      {/* Member Directory List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMembers.map((member) => {
          const name = member.full_name || member.name || member.email || 'User';
          const isSelf = member.email === currentUser?.email || member.id === currentUser?.id;
          const isOnline = member.is_online !== false;
          const isAdminBadge = member.role === 'admin';

          return (
            <div
              key={member.id || member.email}
              className="group flex items-center justify-between p-2 rounded-xl hover:bg-stone-200/40 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-stone-800 dark:text-zinc-200">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#FAF9F6] dark:border-[#121214] ${
                      isOnline ? 'bg-emerald-500' : 'bg-stone-400 dark:bg-zinc-600'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-xs font-medium text-stone-900 dark:text-zinc-100 truncate">
                      {name}
                    </p>
                    {isSelf && (
                      <span className="text-[10px] text-stone-400 font-normal">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] text-stone-400 dark:text-zinc-500">
                    {isAdminBadge ? (
                      <span className="inline-flex items-center space-x-0.5 text-amber-600 dark:text-amber-400 font-medium">
                        <Shield size={10} />
                        <span>{member.email.split('@')[0]}-admin</span>
                      </span>
                    ) : (
                      <span className="capitalize">{member.role || 'member'}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  selectDM(member);
                  onClose();
                }}
                title={`Direct Message ${name}`}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
              >
                <MessageCircle size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}