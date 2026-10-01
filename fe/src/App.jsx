import React, { useState, useEffect, Component } from 'react';
import WorkspaceRail from './components/Workspace/WorkspaceRail';
import Sidebar from './components/Layout/Sidebar';
import ChatView from './components/Message/ChatView';
import DirectMessagePanel from './components/DirectMessage/DirectMessagePanel';
import CommandPalette from './components/Search/CommandPalette';
import MemberDrawer from './components/Workspace/MemberDrawer';
import WorkspaceSettingsModal from './components/Settings/WorkspaceSettingsModal';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#121214] text-stone-900 dark:text-zinc-100 p-6 text-center select-none">
          <div className="max-w-md p-6 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-base font-semibold text-red-500">Something went wrong</h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-xl cursor-pointer"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginScreen() {
  const { login } = useAuth();
  const workspaceContext = useWorkspace();
  const globalMembers = workspaceContext?.globalMembers || [];
  const adminProfile = workspaceContext?.adminProfile;

  const [email, setEmail] = useState('admin@connectteams.com');
  const [password, setPassword] = useState('SecurePassword123!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validMembers = (globalMembers || []).filter(
    (m) =>
      m &&
      m.email &&
      m.email.toLowerCase().endsWith('@connectteams.com') &&
      !m.email.toLowerCase().includes('elena') &&
      m.email.toLowerCase() !== 'admin@connectteams.com'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await login(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelectUser = (targetEmail) => {
    setEmail(targetEmail);
    setPassword('SecurePassword123!');
  };

  const adminDisplayName = adminProfile?.full_name || 'System Admin';

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#0F0F11] text-stone-900 dark:text-zinc-100 p-4 select-none">
      <div className="w-full max-w-sm p-6 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-4">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 mx-auto rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg mb-2 shadow-xs">
            C
          </div>
          <h2 className="text-base font-semibold">Sign in to Connect Teams</h2>
          <p className="text-xs text-stone-500 dark:text-zinc-400">1 Admin + up to 7 Member accounts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 mb-1 block">Work Email</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@connectteams.com"
              className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-xl text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 mb-1 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-xl text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 mt-2 bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 border-t border-stone-100 dark:border-zinc-800">
          <p className="text-[11px] font-semibold text-stone-600 dark:text-zinc-400 mb-1.5">
            Click to auto-fill sign in:
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            <div
              onClick={() => handleQuickSelectUser('admin@connectteams.com')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border transition-colors ${
                email === 'admin@connectteams.com'
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-transparent hover:bg-stone-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="truncate">
                <span className="font-semibold text-stone-900 dark:text-zinc-200">{adminDisplayName}</span>
                <span className="text-[10px] text-stone-400 block truncate">admin@connectteams.com</span>
              </div>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                System Admin
              </span>
            </div>

            {validMembers.map((m) => {
              const isAdminBadge = m.role === 'admin';
              return (
                <div
                  key={m.id || m.email}
                  onClick={() => handleQuickSelectUser(m.email)}
                  className={`p-1.5 px-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border transition-colors ${
                    email === m.email
                      ? 'border-stone-900 dark:border-zinc-100 bg-stone-100 dark:bg-zinc-800'
                      : 'border-transparent hover:bg-stone-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-medium text-stone-900 dark:text-zinc-200 truncate">{m.full_name}</span>
                    <span className="text-[10px] text-stone-400 block truncate">{m.email}</span>
                  </div>
                  {isAdminBadge ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                      {m.email.split('@')[0]}-admin
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400">
                      Member
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MainDashboard() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F6] dark:bg-[#121214] text-stone-900 dark:text-zinc-100 select-none">
      <WorkspaceRail />
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Channel Viewport (Always #general by default) */}
      <ChatView
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenMembers={() => setIsMembersOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Side DM Panel */}
      <DirectMessagePanel />

      <MemberDrawer
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
      />

      <WorkspaceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainDashboard /> : <LoginScreen />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <AppContent />
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}