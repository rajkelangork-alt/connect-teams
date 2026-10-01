import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trash2,
  Hash,
  ShieldAlert,
  Edit2,
  Shield,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

export default function WorkspaceSettingsModal({ isOpen, onClose }) {
  const {
    currentWorkspace,
    workspaces = [],
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    channels = [],
    renameChannel,
    deleteChannel,
    members = [],
    globalMembers = [],
    adminProfile,
    updateAdminName,
    updateMemberRole,
    deleteMember,
  } = useWorkspace();

  const { user } = useAuth();

  const isSystemAdmin = user?.email?.toLowerCase() === 'admin@connectteams.com';
  const isWorkspaceAdmin = !isSystemAdmin && user?.role === 'admin';
  const canManageChannels = isSystemAdmin || isWorkspaceAdmin;

  // selectedWsId controls the modal's inspection scope ONLY
  const [selectedWsId, setSelectedWsId] = useState(currentWorkspace?.id || workspaces[0]?.id);
  const [activeTab, setActiveTab] = useState('channels');
  const [confirmedWsDelete, setConfirmedWsDelete] = useState(false);

  // Accordion expanded workspaces in the Workspaces tab
  const [expandedWsId, setExpandedWsId] = useState(null);

  // Workspace Rename states
  const [editingWsId, setEditingWsId] = useState(null);
  const [editWsName, setEditWsName] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);

  // Channel Rename states
  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTopic, setEditTopic] = useState('');

  // Admin Profile Rename states
  const [isEditingAdminName, setIsEditingAdminName] = useState(false);
  const [customAdminName, setCustomAdminName] = useState('');

  // When modal is first opened, default the dropdown to the active workspace
  useEffect(() => {
    if (isOpen && currentWorkspace?.id) {
      setSelectedWsId(currentWorkspace.id);
    }
  }, [isOpen, currentWorkspace?.id]);

  // Target workspace inspected by this modal
  const targetWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === selectedWsId) || currentWorkspace || workspaces[0];
  }, [workspaces, selectedWsId, currentWorkspace]);

  // Read channels for the inspected workspace
  const targetChannels = useMemo(() => {
    if (targetWorkspace?.id === currentWorkspace?.id) return channels;
    try {
      const raw = localStorage.getItem('ct_persistent_channels');
      const parsed = raw ? JSON.parse(raw) : {};
      return (
        parsed[targetWorkspace?.id] || [
          { id: Number(`${targetWorkspace?.id}01`), name: 'general', topic: 'General discussion' },
        ]
      );
    } catch {
      return [{ id: 999, name: 'general', topic: 'General discussion' }];
    }
  }, [targetWorkspace, currentWorkspace, channels]);

  // Read members for the inspected workspace
  const targetMembers = useMemo(() => {
    if (targetWorkspace?.id === currentWorkspace?.id) return members;
    try {
      const raw = localStorage.getItem('ct_persistent_members');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed[targetWorkspace?.id] || [];
    } catch {
      return [];
    }
  }, [targetWorkspace, currentWorkspace, members]);

  if (!isOpen) return null;

  const adminBadgedMembers = globalMembers.filter(
    (m) => m.role === 'admin' && m.email !== 'admin@connectteams.com'
  );

  // STRICT: Changing the dropdown only changes settings inspection, NOT the background active workspace
  const handleDropdownChange = (e) => {
    const wsId = Number(e.target.value);
    setSelectedWsId(wsId);
  };

  const handleStartEditWs = (ws, e) => {
    e.stopPropagation();
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
  };

  const handleSaveEditWs = (wsId, e) => {
    if (e) e.stopPropagation();
    if (!editWsName.trim()) return;
    if (renameWorkspace) renameWorkspace(wsId, editWsName.trim());
    setEditingWsId(null);
  };

  const handleCreateNewWs = async (e) => {
    e.preventDefault();
    if (!newWsName.trim() || !createWorkspace) return;
    await createWorkspace(newWsName.trim());
    setNewWsName('');
    setIsCreatingWs(false);
  };

  const startEditingChannel = (channel) => {
    if (!canManageChannels) return;
    setEditingChannelId(channel.id);
    setEditName(channel.name);
    setEditTopic(channel.topic || '');
  };

  const handleSaveRenameChannel = (channelId) => {
    if (!canManageChannels || !editName.trim()) return;
    renameChannel(channelId, editName, editTopic);
    setEditingChannelId(null);
  };

  const handleSaveAdminName = (e) => {
    e.preventDefault();
    if (!customAdminName.trim()) return;
    updateAdminName(customAdminName.trim());
    setIsEditingAdminName(false);
  };

  const getWorkspaceOverviewData = (wsId) => {
    let wsMembersList = [];
    let wsChannelsList = [];
    try {
      const rawM = localStorage.getItem('ct_persistent_members');
      const parsedM = rawM ? JSON.parse(rawM) : {};
      wsMembersList = parsedM[wsId] || [];

      const rawC = localStorage.getItem('ct_persistent_channels');
      const parsedC = rawC ? JSON.parse(rawC) : {};
      wsChannelsList = parsedC[wsId] || [{ name: 'general' }];
    } catch {
      wsMembersList = [];
      wsChannelsList = [{ name: 'general' }];
    }

    const allParticipants = [adminProfile, ...wsMembersList];
    const channelNames = wsChannelsList.map((c) => `#${c.name}`).join(', ');

    return { allParticipants, channelNames };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      {/* Fixed Dimension Modal Dialog */}
      <div className="w-[620px] h-[480px] bg-white dark:bg-[#151518] border border-stone-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col shrink-0">
        
        {/* Header with Title, Badge, Settings Workspace Selector Dropdown, and Close Button */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Settings</h2>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                isSystemAdmin
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold'
                  : isWorkspaceAdmin
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                  : 'bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {isSystemAdmin ? 'System Admin (Full Access)' : isWorkspaceAdmin ? 'Workspace Admin' : 'View Only'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Dropdown changes inspection scope inside Settings ONLY */}
            <div className="relative">
              <select
                value={targetWorkspace?.id || ''}
                onChange={handleDropdownChange}
                className="text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer appearance-none truncate max-w-[170px]"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-zinc-800 px-5 space-x-4 shrink-0">
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'channels'
                ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            Channels ({targetChannels.length})
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            Members ({targetMembers.length + 1})
          </button>

          {isSystemAdmin && (
            <button
              onClick={() => setActiveTab('workspaces')}
              className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'workspaces'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-zinc-200'
              }`}
            >
              Workspaces ({workspaces.length})
            </button>
          )}

          {isSystemAdmin && (
            <button
              onClick={() => setActiveTab('danger')}
              className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'danger'
                  ? 'border-red-600 text-red-600 dark:text-red-400 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-zinc-200'
              }`}
            >
              Danger Zone
            </button>
          )}
        </div>

        {/* Scrollable Content Viewport */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: WORKSPACES (System Admin Overview) */}
          {activeTab === 'workspaces' && isSystemAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                    All Workspaces Overview
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Click a workspace to inspect its members and channels.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingWs((prev) => !prev)}
                  className="px-2.5 py-1 text-xs bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </button>
              </div>

              {isCreatingWs && (
                <form
                  onSubmit={handleCreateNewWs}
                  className="p-2.5 bg-stone-100 dark:bg-zinc-800/60 rounded-xl space-y-2"
                >
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="Workspace name (e.g. Mobile Engineering)"
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingWs(false)}
                      className="px-2 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-amber-500 text-white rounded-md font-semibold cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-stone-100 dark:divide-zinc-800/60 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {workspaces.map((ws) => {
                  const isExpanded = expandedWsId === ws.id;
                  const isEditing = editingWsId === ws.id;
                  const { allParticipants, channelNames } = getWorkspaceOverviewData(ws.id);

                  return (
                    <div key={ws.id} className="bg-stone-50/50 dark:bg-zinc-900/40">
                      {/* Workspace Header Row */}
                      <div
                        onClick={() => setExpandedWsId(isExpanded ? null : ws.id)}
                        className="p-3 flex items-center justify-between hover:bg-stone-100/60 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-stone-400 shrink-0" />
                          ) : (
                            <ChevronRight size={14} className="text-stone-400 shrink-0" />
                          )}
                          <div className="w-6 h-6 rounded-md bg-stone-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-stone-700 dark:text-zinc-300 shrink-0">
                            {ws.name.charAt(0).toUpperCase()}
                          </div>

                          {isEditing ? (
                            <div
                              className="flex items-center space-x-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editWsName}
                                onChange={(e) => setEditWsName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditWs(ws.id, e);
                                  if (e.key === 'Escape') setEditingWsId(null);
                                }}
                                className="text-xs px-2 py-0.5 bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-600 rounded text-stone-900 dark:text-zinc-100"
                              />
                              <button
                                onClick={(e) => handleSaveEditWs(ws.id, e)}
                                className="p-1 bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded cursor-pointer"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={() => setEditingWsId(null)}
                                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate">
                              {ws.name}
                            </span>
                          )}
                        </div>

                        {/* Actions: strictly Rename and Delete (NO switch button) */}
                        <div
                          className="flex items-center space-x-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleStartEditWs(ws, e)}
                            title="Rename workspace"
                            className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 rounded cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          {workspaces.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Permanently delete workspace "${ws.name}"?`)) {
                                  deleteWorkspace(ws.id);
                                }
                              }}
                              title="Delete workspace"
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Accordion Body: Displays members with channel names */}
                      {isExpanded && (
                        <div className="px-5 py-2.5 pb-3 bg-stone-100/50 dark:bg-zinc-950/40 border-t border-stone-200/50 dark:border-zinc-800/50 space-y-2">
                          <p className="text-[10px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                            Members &amp; Channels
                          </p>
                          <div className="space-y-1">
                            {allParticipants.map((p, idx) => {
                              const isRoot = p?.email === 'admin@connectteams.com';
                              const name = isRoot
                                ? adminProfile?.full_name || 'System Admin'
                                : p?.full_name || 'Member';

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-white/60 dark:bg-zinc-900/60 border border-stone-200/40 dark:border-zinc-800/40"
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    <User size={12} className="text-stone-400 shrink-0" />
                                    <span className="font-medium text-stone-800 dark:text-zinc-200 truncate">
                                      {name}
                                    </span>
                                    {isRoot && (
                                      <span className="text-[9px] px-1 rounded bg-amber-200/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                                        System Admin
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-mono text-stone-500 dark:text-zinc-400 truncate max-w-[220px]">
                                    {channelNames || '#general'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CHANNELS (Scoped to targetWorkspace) */}
          {activeTab === 'channels' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Channels inside{' '}
                <strong className="text-stone-900 dark:text-zinc-100">
                  {targetWorkspace?.name}
                </strong>
                :
              </p>
              <div className="divide-y divide-stone-100 dark:divide-zinc-800/60 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {targetChannels.map((ch) => {
                  const isEditing = editingChannelId === ch.id;

                  return (
                    <div
                      key={ch.id}
                      className="p-3 bg-stone-50/50 dark:bg-zinc-900/40 hover:bg-stone-100/50 dark:hover:bg-zinc-900/80 transition-colors"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-stone-400 text-xs font-mono">#</span>
                            <input
                              type="text"
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameChannel(ch.id);
                                if (e.key === 'Escape') setEditingChannelId(null);
                              }}
                              placeholder="channel-name"
                              className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-600 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editTopic}
                              onChange={(e) => setEditTopic(e.target.value)}
                              placeholder="Channel topic (optional)"
                              className="flex-1 text-xs px-2.5 py-1 bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-600 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameChannel(ch.id)}
                              className="px-2.5 py-1 text-xs bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-medium cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingChannelId(null)}
                              className="px-2 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-zinc-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 truncate">
                            <Hash size={14} className="text-stone-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-stone-900 dark:text-zinc-200 truncate">
                                {ch.name}
                              </p>
                              {ch.topic && (
                                <p className="text-[10px] text-stone-400 truncate">{ch.topic}</p>
                              )}
                            </div>
                          </div>

                          {canManageChannels && (
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => startEditingChannel(ch)}
                                title="Rename channel"
                                className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>

                              {ch.name !== 'general' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete #${ch.name}?`)) {
                                      deleteChannel(ch.id);
                                    }
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Delete channel"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERS (Scoped to targetWorkspace) */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
                <span>
                  Members in{' '}
                  <strong className="text-stone-900 dark:text-zinc-100">
                    {targetWorkspace?.name}
                  </strong>{' '}
                  ({targetMembers.length + 1})
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  Admin Badges: {adminBadgedMembers.length}/2
                </span>
              </div>

              {/* System Admin Card */}
              <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900/80 flex items-center justify-center text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0">
                      {(adminProfile?.full_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-stone-900 dark:text-zinc-100 flex items-center space-x-1.5 truncate">
                        <span>{adminProfile?.full_name || 'System Admin'}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          System Admin
                        </span>
                      </p>
                      <p className="text-[10px] text-stone-500 dark:text-zinc-400 truncate">
                        admin@connectteams.com • Root Owner
                      </p>
                    </div>
                  </div>

                  {isSystemAdmin && !isEditingAdminName && (
                    <button
                      onClick={() => {
                        setCustomAdminName(adminProfile?.full_name || 'System Admin');
                        setIsEditingAdminName(true);
                      }}
                      title="Edit Admin Name"
                      className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-zinc-100 rounded-lg cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>

                {isEditingAdminName && (
                  <form onSubmit={handleSaveAdminName} className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={customAdminName}
                      onChange={(e) => setCustomAdminName(e.target.value)}
                      placeholder="Enter new admin name"
                      className="flex-1 text-xs px-2.5 py-1 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-lg text-stone-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-xs bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-medium cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAdminName(false)}
                      className="px-2 py-1 text-xs text-stone-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {/* Members List */}
              <div className="divide-y divide-stone-100 dark:divide-zinc-800/60 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {targetMembers.map((m) => {
                  const isAdminBadge = m.role === 'admin';
                  const isAlex = m.email === 'alex@connectteams.com';

                  return (
                    <div
                      key={m.id || m.email}
                      className="p-3 flex items-center justify-between bg-stone-50/50 dark:bg-zinc-900/40"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-stone-800 dark:text-zinc-200 shrink-0">
                          {m.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate flex items-center space-x-1.5">
                            <span>{m.full_name}</span>
                            {isAdminBadge ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {m.email.split('@')[0]}-admin
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-normal bg-stone-200/60 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Member
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-stone-400 truncate">{m.email}</p>
                        </div>
                      </div>

                      {isSystemAdmin && (
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateMemberRole(m.id, isAdminBadge ? 'member' : 'admin')}
                            title={isAdminBadge ? 'Revoke Admin Badge' : 'Grant Admin Badge (Max 2)'}
                            className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                              isAdminBadge
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                                : 'bg-stone-200/70 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-stone-900'
                            }`}
                          >
                            <Shield size={11} />
                            <span>{isAdminBadge ? 'Revoke Admin' : 'Make Admin'}</span>
                          </button>

                          {!isAlex && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete profile for ${m.full_name}?`)) {
                                  deleteMember(m.id);
                                }
                              }}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete member"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE (Scoped strictly to targetWorkspace) */}
          {activeTab === 'danger' && isSystemAdmin && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/20">
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xs font-semibold text-red-900 dark:text-red-300">
                      Delete workspace: {targetWorkspace?.name}
                    </h3>
                    <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                      Only the System Admin can delete workspaces. Deleting{' '}
                      <strong>{targetWorkspace?.name}</strong> removes all its channels and associated records.
                    </p>

                    <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmedWsDelete}
                        onChange={(e) => setConfirmedWsDelete(e.target.checked)}
                        className="rounded border-stone-300 dark:border-zinc-700 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-stone-700 dark:text-zinc-300 select-none">
                        I confirm deletion of <strong>{targetWorkspace?.name}</strong>
                      </span>
                    </label>

                    <button
                      disabled={!confirmedWsDelete || workspaces.length <= 1}
                      onClick={() => {
                        deleteWorkspace(targetWorkspace.id);
                        onClose();
                      }}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Permanently Delete {targetWorkspace?.name}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}