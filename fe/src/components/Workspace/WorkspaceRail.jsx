import React, { useState } from 'react';
import { Plus, LogOut, Sun, Moon } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function WorkspaceRail() {
  const {
    workspaces = [],
    currentWorkspace,
    selectWorkspace,
    createWorkspace,
  } = useWorkspace();

  const { logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'W';
    const parts = name.trim().split(/[\s.-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const name = newWorkspaceName.trim();
    if (!name || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (createWorkspace) {
        await createWorkspace(name);
      }
      setNewWorkspaceName('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <nav className="w-16 h-screen flex flex-col items-center py-3 bg-[#EFECE6] dark:bg-[#0A0A0C] border-r border-stone-200 dark:border-zinc-800/80 shrink-0 select-none transition-colors z-20">
      {/* Brand Icon */}
      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 flex items-center justify-center font-bold text-stone-900 dark:text-zinc-100 shadow-xs mb-4">
        C
      </div>

      <div className="w-8 h-px bg-stone-300/80 dark:bg-zinc-800 mb-3" />

      {/* Workspaces List */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2.5 overflow-y-auto no-scrollbar">
        {(workspaces || []).map((ws) => {
          const isActive =
            String(currentWorkspace?.id) === String(ws.id) ||
            currentWorkspace?.name?.toLowerCase().trim() === ws.name?.toLowerCase().trim();

          return (
            <div key={ws.id || ws.name} className="relative group flex items-center justify-center">
              <span
                className={`absolute -left-3 w-1 rounded-r-full bg-stone-900 dark:bg-zinc-100 transition-all duration-200 ${
                  isActive ? 'h-7 opacity-100' : 'h-0 opacity-0 group-hover:h-3 group-hover:opacity-60'
                }`}
              />

              <button
                type="button"
                onClick={() => selectWorkspace && selectWorkspace(ws)}
                title={ws.name}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md rounded-xl'
                    : 'bg-stone-200/80 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-300 hover:bg-stone-300 dark:hover:bg-zinc-700 hover:rounded-xl'
                }`}
              >
                {getInitials(ws.name)}
              </button>
            </div>
          );
        })}

        {/* Add Workspace Action - Admin Only */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Create New Workspace (Admin only)"
            className="w-10 h-10 rounded-2xl bg-stone-200/50 dark:bg-zinc-900 border border-dashed border-stone-300 dark:border-zinc-700 flex items-center justify-center text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:border-stone-400 dark:hover:border-zinc-500 hover:rounded-xl transition-all cursor-pointer"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Theme Toggle & Logout */}
      <div className="pt-2 flex flex-col items-center space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400 hover:text-amber-300 transition-transform hover:rotate-45" />
          ) : (
            <Moon size={18} className="text-stone-600 hover:text-stone-900 transition-transform hover:-rotate-12" />
          )}
        </button>

        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className="p-2 text-stone-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
        >
          <LogOut size={17} />
        </button>
      </div>

      {/* Create Workspace Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#151518] border border-stone-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 mb-1">
              Create New Workspace
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mb-4">
              Workspaces organize your team channels and direct messages.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                required
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name (e.g. Design)"
                className="w-full text-xs px-3 py-2 bg-stone-50 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-xl text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWorkspaceName.trim() || isSubmitting}
                  className="px-3 py-1.5 text-xs bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}