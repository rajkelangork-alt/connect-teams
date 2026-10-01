import React, { useState } from 'react';
import { X, Trash2, Hash, Layers, ShieldAlert, Sun, Moon, Database } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { currentWorkspace, deleteWorkspace, channels, deleteChannel } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('workspace');
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(false);

  if (!isOpen) return null;

  const handleDeleteCurrentWorkspace = () => {
    if (!currentWorkspace?.id) return;
    deleteWorkspace(currentWorkspace.id);
    setConfirmDeleteWs(false);
    onClose();
  };

  const handleClearAllStorage = () => {
    if (window.confirm('Clear all local app cache and reload?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#151518] border border-stone-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Workspace Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Tabs */}
        <div className="flex flex-1 min-h-0">
          {/* Navigation Sidebar */}
          <div className="w-48 border-r border-stone-200 dark:border-zinc-800 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                  : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
              }`}
            >
              <Layers size={14} />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('channels')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'channels'
                  ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                  : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
              }`}
            >
              <Hash size={14} />
              <span>Channels ({channels.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                  : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
              }`}
            >
              <Database size={14} />
              <span>System & Theme</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'workspace' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                    Workspace Details
                  </h3>
                  <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
                    <p className="text-xs text-stone-500 dark:text-zinc-400">Current Workspace</p>
                    <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 mt-0.5">
                      {currentWorkspace?.name}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 dark:border-zinc-800">
                  <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1.5">
                    <ShieldAlert size={14} />
                    <span>Danger Zone</span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                    Deleting this workspace will remove all of its associated channels and data.
                  </p>

                  {!confirmDeleteWs ? (
                    <button
                      onClick={() => setConfirmDeleteWs(true)}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete Workspace</span>
                    </button>
                  ) : (
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={handleDeleteCurrentWorkspace}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteWs(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'channels' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                  Manage Workspace Channels
                </h3>
                <div className="divide-y divide-stone-200 dark:divide-zinc-800 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900/50"
                    >
                      <div className="flex items-center space-x-2">
                        <Hash size={14} className="text-stone-400" />
                        <div>
                          <p className="text-xs font-medium text-stone-900 dark:text-zinc-200">
                            {ch.name}
                          </p>
                          {ch.topic && (
                            <p className="text-[11px] text-stone-400 dark:text-zinc-500">
                              {ch.topic}
                            </p>
                          )}
                        </div>
                      </div>

                      {channels.length > 1 && (
                        <button
                          onClick={() => deleteChannel(ch.id)}
                          title="Delete channel"
                          className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                    Appearance
                  </h3>
                  <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                      <span className="text-xs font-medium capitalize">{theme} Mode</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-stone-300 dark:border-zinc-700 hover:bg-stone-200/50 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 dark:border-zinc-800">
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                    Local App Data & Caches
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                    Clear locally cached messages, files, reactions, and workspaces to re-sync fresh.
                  </p>
                  <button
                    onClick={handleClearAllStorage}
                    className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 dark:text-zinc-300 border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Database size={13} />
                    <span>Reset All Local Storage</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}