import React, { useState, useEffect, useCallback } from 'react';
import { User, BotServer, ClusterOverview } from './types';
import { fetchApi, getAuthToken, setAuthToken } from './lib/api';
import { ThemeProvider } from './lib/theme';
import { NotificationProvider } from './lib/notifications';
import { Sidebar, AppView } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { ServerListView } from './components/ServerListView';
import { ServerDetailView } from './components/ServerDetailView';
import { ApiTokensView } from './components/ApiTokensView';
import { ResourceQuotasView } from './components/ResourceQuotasView';
import { SecurityView } from './components/SecurityView';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { AdminConsoleView } from './components/AdminConsoleView';
import { SystemHealthView } from './components/SystemHealthView';
import { AdminPanel, AdminTab } from './components/AdminPanel';
import { StoreView } from './components/StoreView';
import { EarnRewardsView } from './components/EarnRewardsView';
import { ApiDocsView } from './components/ApiDocsView';
import { AccessDeniedView } from './components/AccessDeniedView';
import { NotFoundView } from './components/NotFoundView';
import { SuspendedView } from './components/SuspendedView';
import { CreateBotModal } from './components/CreateBotModal';
import { AccountModal } from './components/AccountModal';
import { AuthModal } from './components/AuthModal';
import { AiDebuggerModal } from './components/AiDebuggerModal';
import { HealthMonitorModal } from './components/HealthMonitorModal';
import { SystemAnnouncementBanner } from './components/SystemAnnouncementBanner';
import {
  TopProgressBar,
  DashboardSkeleton,
  ServerDetailSkeleton,
  AdminSkeleton,
  GenericPageSkeleton,
  AppSkeletonLoader
} from './components/SkeletonLoader';
import { AuthPage } from './components/AuthPage';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('overview');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [serverDetailInitialTab, setServerDetailInitialTab] = useState<string>('overview');

  const [servers, setServers] = useState<BotServer[]>([]);
  const [clusterOverview, setClusterOverview] = useState<ClusterOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Sidebar collapse state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('xorvila_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('xorvila_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Modals & Tools
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'profile' | 'tokens' | 'quotas' | 'security'>('profile');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiDebuggerOpen, setAiDebuggerOpen] = useState(false);
  const [aiInitialLogs, setAiInitialLogs] = useState<string>('');
  const [healthMonitorOpen, setHealthMonitorOpen] = useState(false);

  // Parse URL to determine route / view
  // Parse URL to determine route / view with clean slash paths (/servers/id/tab)
  const parseRouteFromUrl = useCallback(() => {
    const search = window.location.search;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(search);

    // 1. Check for server in path: /servers/:id or /servers/:id/:tab or /server/:id
    const serverMatch = pathname.match(/^\/(?:servers|server)\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?/i);
    if (serverMatch && serverMatch[1]) {
      const sId = serverMatch[1];
      const sTab = serverMatch[2] || searchParams.get('tab') || 'overview';
      setSelectedServerId(sId);
      setServerDetailInitialTab(sTab);
      return;
    }

    // 2. Check for server in query parameter fallback (?server=...)
    const serverParam = searchParams.get('server');
    if (serverParam) {
      const sTab = searchParams.get('tab') || 'overview';
      setSelectedServerId(serverParam);
      setServerDetailInitialTab(sTab);
      return;
    }

    // 3. Admin routes: /admin or /admin/:tab
    const adminMatch = pathname.match(/^\/admin(?:\/([a-zA-Z0-9_-]+))?/i);
    if (adminMatch || pathname.includes('admin') || search.includes('admin')) {
      setActiveView('admin');
      const tab = (adminMatch?.[1] || searchParams.get('tab') || 'overview') as AdminTab;
      setAdminActiveTab(tab);
      setSelectedServerId(null);
      return;
    }

    // 4. Store and Earn Rewards routes
    if (pathname.includes('/store') || search.includes('store')) {
      setActiveView('store');
      setSelectedServerId(null);
      return;
    }

    if (pathname.includes('/earn-rewards') || pathname.includes('/rewards') || search.includes('rewards')) {
      setActiveView('earn-rewards');
      setSelectedServerId(null);
      return;
    }

    // 5. Other view routes
    if (pathname.includes('/tokens') || search.includes('tokens')) {
      setActiveView('tokens');
      setSelectedServerId(null);
      return;
    }

    if (pathname.includes('/quotas') || search.includes('quotas')) {
      setActiveView('quotas');
      setSelectedServerId(null);
      return;
    }

    if (pathname.includes('/security') || search.includes('security')) {
      setActiveView('security');
      setSelectedServerId(null);
      return;
    }

    if (pathname.includes('/docs') || search.includes('docs')) {
      setActiveView('docs');
      setSelectedServerId(null);
      return;
    }

    if (pathname.includes('/servers') || search.includes('servers')) {
      setActiveView('servers');
      setSelectedServerId(null);
      return;
    }

    // Modals trigger
    if (search.includes('accountsettings') || search.includes('profile')) {
      setAccountModalTab('profile');
      setAccountModalOpen(true);
    }

    if (pathname.includes('/auth') || search.includes('auth') || search.includes('?=login') || search.includes('?=register')) {
      // Auth route handled by AuthPage when logged out or redirected
      setActiveView('dashboard');
      setSelectedServerId(null);
      return;
    }

    if (search.includes('create') || search.includes('new')) {
      setCreateModalOpen(true);
    }

    // Check for explicit standard views
    if (pathname === '/' || pathname === '/dashboard') {
      setActiveView('dashboard');
      setSelectedServerId(null);
      return;
    }

    // Unrecognized route -> Render 404 page
    if (
      pathname !== '/' &&
      !pathname.startsWith('/dashboard') &&
      !pathname.startsWith('/servers') &&
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/store') &&
      !pathname.startsWith('/earn-rewards') &&
      !pathname.startsWith('/rewards')
    ) {
      setActiveView('404');
      setSelectedServerId(null);
      return;
    }

    // Default to dashboard
    setActiveView('dashboard');
    setSelectedServerId(null);
  }, []);

  // Sync browser URL with clean slash paths (/servers/bot-1/console, /servers, /dashboard)
  const syncUrl = useCallback((view: string, serverId: string | null = null, tab: string | null = null) => {
    try {
      let targetPath = '/dashboard';
      if (serverId || view === 'server') {
        const id = serverId || selectedServerId;
        if (id) {
          targetPath = `/servers/${encodeURIComponent(id)}${tab && tab !== 'overview' ? `/${tab}` : ''}`;
        } else {
          targetPath = '/servers';
        }
      } else if (view === 'dashboard') {
        targetPath = '/dashboard';
      } else if (view === 'servers') {
        targetPath = '/servers';
      } else if (view === 'store') {
        targetPath = '/store';
      } else if (view === 'earn-rewards') {
        targetPath = '/earn-rewards';
      } else if (view === 'tokens') {
        targetPath = '/tokens';
      } else if (view === 'docs') {
        targetPath = '/docs';
      } else if (view === 'quotas') {
        targetPath = '/quotas';
      } else if (view === 'security') {
        targetPath = '/security';
      } else if (view === 'admin-database') {
        targetPath = '/admin/database';
      } else if (view === 'admin-console') {
        targetPath = '/admin/overview';
      } else if (view === 'admin-health') {
        targetPath = '/admin/health';
      } else if (view === 'admin') {
        targetPath = tab && tab !== 'overview' ? `/admin/${tab}` : '/admin';
      }

      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view, serverId, tab }, '', targetPath);
      }
    } catch (e) {
      // Ignore pushState restrictions in restricted iframe environments
    }
  }, [selectedServerId]);

  const handleNavigate = (view: AppView, tab?: string) => {
    setIsNavigating(true);
    setActiveView(view);
    setSelectedServerId(null);
    if (view === 'admin' && tab) {
      setAdminActiveTab(tab as AdminTab);
    }
    syncUrl(view, null, tab);
    setTimeout(() => setIsNavigating(false), 250);
  };

  // Load current user authentication session via JWT
  const initAuth = async () => {
    const token = getAuthToken();
    if (token) {
      const res = await fetchApi<User>('/auth/me');
      if (res.success && res.data) {
        setCurrentUser(res.data);
        return res.data;
      } else {
        // Expired or invalid session token: clean up
        setAuthToken(null);
        setCurrentUser(null);
        return null;
      }
    }

    // No existing session token: user must log in
    setCurrentUser(null);
    return null;
  };

  const loadServersAndStats = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [srvRes, clusterRes] = await Promise.all([
        fetchApi<BotServer[]>('/servers'),
        fetchApi<ClusterOverview>('/admin/overview')
      ]);

      if (srvRes.success && srvRes.data) {
        setServers(srvRes.data);
      }
      if (clusterRes.success && clusterRes.data) {
        setClusterOverview(clusterRes.data);
      }
    } catch (e) {
      // Unauthenticated or network issue
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const start = async () => {
      parseRouteFromUrl();
      try {
        const authenticatedUser = await initAuth();
        if (authenticatedUser) {
          await loadServersAndStats();
        }
      } catch (e) {
      } finally {
        setIsAuthChecking(false);
      }
    };
    start();

    // Listen to browser popstate navigation (Back / Forward buttons)
    const handlePopState = () => {
      parseRouteFromUrl();
    };
    window.addEventListener('popstate', handlePopState);

    // Global Command Palette Shortcut (⌘K / Ctrl+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Live Server State Polling (realtime streaming sync)
    const interval = setInterval(() => {
      loadServersAndStats(true);
    }, 4000);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, [parseRouteFromUrl]);

  const handleLogout = async () => {
    await fetchApi('/auth/logout', { method: 'POST' });
    setAuthToken(null);
    setCurrentUser(null);
    setAuthModalOpen(true);
    syncUrl('dashboard');
  };

  const handleSelectServer = (serverId: string, initialTab: string = 'overview') => {
    setIsNavigating(true);
    setSelectedServerId(serverId);
    setServerDetailInitialTab(initialTab);
    syncUrl('server', serverId, initialTab);
    setTimeout(() => setIsNavigating(false), 250);
  };

  const actionCooldownsRef = React.useRef<Map<string, number>>(new Map());

  const handleStartServer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const last = actionCooldownsRef.current.get(id) || 0;
    if (Date.now() - last < 2000) return;
    actionCooldownsRef.current.set(id, Date.now());

    setServers(prev => prev.map(s => (s.id === id ? { ...s, status: 'starting' } : s)));
    await fetchApi(`/servers/${id}/start`, { method: 'POST' });
  };

  const handleStopServer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const last = actionCooldownsRef.current.get(id) || 0;
    if (Date.now() - last < 2000) return;
    actionCooldownsRef.current.set(id, Date.now());

    setServers(prev => prev.map(s => (s.id === id ? { ...s, status: 'stopping' } : s)));
    await fetchApi(`/servers/${id}/stop`, { method: 'POST' });
  };

  const handleRestartServer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const last = actionCooldownsRef.current.get(id) || 0;
    if (Date.now() - last < 2000) return;
    actionCooldownsRef.current.set(id, Date.now());

    setServers(prev => prev.map(s => (s.id === id ? { ...s, status: 'restarting' } : s)));
    await fetchApi(`/servers/${id}/restart`, { method: 'POST' });
  };

  const handleServerCreated = (newServer: BotServer) => {
    setServers(prev => [newServer, ...prev]);
    setSelectedServerId(newServer.id);
    setServerDetailInitialTab('overview');
    syncUrl('server', newServer.id);
  };

  const selectedServer = servers.find(s => s.id === selectedServerId);
  const isAdmin = currentUser?.role === 'admin';

  // Render view router body with skeleton fallback during page transition
  const renderMainContent = () => {
    if (isNavigating) {
      if (selectedServerId) {
        return <ServerDetailSkeleton />;
      }
      if (activeView === 'dashboard' || activeView === 'servers') {
        return <DashboardSkeleton />;
      }
      if (activeView === 'admin') {
        return <AdminSkeleton />;
      }
      return <GenericPageSkeleton />;
    }

    if (selectedServerId) {
      return (
        <ServerDetailView
          serverId={selectedServerId}
          initialTab={serverDetailInitialTab}
          servers={servers}
          onSelectServer={handleSelectServer}
          onTabChange={tab => syncUrl('server', selectedServerId, tab)}
          onBack={() => {
            setIsNavigating(true);
            setSelectedServerId(null);
            syncUrl('servers');
            loadServersAndStats();
            setTimeout(() => setIsNavigating(false), 250);
          }}
          onOpenAiDebugger={logsText => {
            if (logsText) setAiInitialLogs(logsText);
            setAiDebuggerOpen(true);
          }}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
      case 'servers':
        return (
          <ServerListView
            currentUser={currentUser}
            servers={servers}
            loading={loading}
            onSelectServer={handleSelectServer}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onStartServer={handleStartServer}
            onStopServer={handleStopServer}
            onRestartServer={handleRestartServer}
            onOpenAiDebugger={logsText => {
              if (logsText) setAiInitialLogs(logsText);
              setAiDebuggerOpen(true);
            }}
          />
        );

      case 'store':
        return (
          <StoreView
            currentUser={currentUser}
            onUserUpdated={updated => setCurrentUser(updated)}
            onNavigateToRewards={() => handleNavigate('earn-rewards')}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        );

      case 'earn-rewards':
        return (
          <EarnRewardsView
            currentUser={currentUser}
            onUserUpdated={updated => setCurrentUser(updated)}
            onNavigateToStore={() => handleNavigate('store')}
          />
        );

      case 'tokens':
        return (
          <ApiTokensView
            currentUser={currentUser}
            onNavigateToDocs={() => handleNavigate('docs')}
          />
        );

      case 'docs':
        return <ApiDocsView />;

      case 'quotas':
        return (
          <ResourceQuotasView
            currentUser={currentUser}
            servers={servers}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        );

      case 'security':
        return (
          <SecurityView
            currentUser={currentUser}
            onUserUpdated={updated => setCurrentUser(updated)}
            onLogout={handleLogout}
          />
        );

      case 'admin':
        if (!isAdmin) {
          return <AccessDeniedView onReturnHome={() => handleNavigate('dashboard')} />;
        }
        return (
          <AdminPanel
            currentUser={currentUser!}
            initialTab={adminActiveTab}
            activeTab={adminActiveTab}
            onTabChange={tab => {
              setAdminActiveTab(tab);
              syncUrl('admin', null, tab);
            }}
            onReturnHome={() => handleNavigate('dashboard')}
          />
        );

      case '403':
        return <AccessDeniedView onReturnHome={() => handleNavigate('dashboard')} />;

      case '404':
        return <NotFoundView onReturnHome={() => handleNavigate('dashboard')} />;

      default:
        return (
          <ServerListView
            currentUser={currentUser}
            servers={servers}
            loading={loading}
            onSelectServer={handleSelectServer}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onStartServer={handleStartServer}
            onStopServer={handleStopServer}
            onRestartServer={handleRestartServer}
            onOpenAiDebugger={logsText => {
              if (logsText) setAiInitialLogs(logsText);
              setAiDebuggerOpen(true);
            }}
          />
        );
    }
  };

  if (isAuthChecking) {
    return <AppSkeletonLoader />;
  }

  if (!currentUser) {
    return (
      <AuthPage
        onSuccess={user => {
          setCurrentUser(user);
          loadServersAndStats();
          syncUrl('dashboard');
        }}
      />
    );
  }

  if (currentUser.suspended) {
    return (
      <SuspendedView
        type="user"
        onReturnHome={() => handleNavigate('dashboard')}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex antialiased selection:bg-purple-500 selection:text-white relative bg-transparent">
      {/* Top Glowing NProgress Bar on Page Navigation / Loading */}
      <TopProgressBar active={isNavigating || loading} />

      {/* Background Wallpaper Image - Universal Fit for PC, Tablet, Mobile & Desktop Mode */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20 select-none">
        <img
          src="https://i.imgur.com/0SCLxYy.png"
          alt="Xorvila Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center fixed inset-0 scale-[1.01]"
        />
        {/* Soft Vignette & Subtle Overlay for High Text Contrast */}
        <div className="absolute inset-0 bg-[#050711]/45 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050711]/50 via-transparent to-[#050711]/75" />
      </div>

      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px]" />
      </div>

      {/* Global Collapsible Sidebar (Desktop) */}
      <Sidebar
        currentUser={currentUser}
        activeView={activeView}
        adminActiveTab={adminActiveTab}
        onAdminTabChange={tab => {
          setAdminActiveTab(tab);
          syncUrl('admin', null, tab);
        }}
        selectedServerId={selectedServerId}
        servers={servers}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onNavigate={handleNavigate}
        onSelectServer={handleSelectServer}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenAccountModal={tab => {
          if (tab) setAccountModalTab(tab);
          setAccountModalOpen(true);
        }}
        onOpenAiDebugger={() => {
          setAiInitialLogs('');
          setAiDebuggerOpen(true);
        }}
        onOpenHealthMonitor={() => handleNavigate('admin', 'health')}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
        {/* Top Command Navbar */}
        <Navbar
          currentUser={currentUser}
          activeView={activeView}
          selectedServerName={selectedServer?.name}
          clusterStats={clusterOverview}
          onNavigate={handleNavigate}
          onOpenCreateModal={() => setCreateModalOpen(true)}
          onOpenAccountModal={tab => {
            if (tab) setAccountModalTab(tab);
            setAccountModalOpen(true);
          }}
          onOpenAuthModal={() => {
            setAuthModalOpen(true);
            try {
              window.history.pushState({}, '', '/?=auth');
            } catch (e) {}
          }}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onLogout={handleLogout}
          onOpenAiDebugger={() => {
            setAiInitialLogs('');
            setAiDebuggerOpen(true);
          }}
          onOpenHealthMonitor={() => handleNavigate('admin-health')}
        />

        {/* Global Cluster Announcements & Critical Broadcasts */}
        <SystemAnnouncementBanner currentUser={currentUser} />

        {/* Content Body */}
        <main className="flex-1 w-full px-3 sm:px-6 py-5 sm:py-6">
          {renderMainContent()}
        </main>
      </div>

      {/* Mobile Dedicated Bottom Bar */}
      <MobileBottomNav
        activeView={activeView}
        selectedServerId={selectedServerId}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenAccountModal={tab => {
          if (tab) setAccountModalTab(tab);
          setAccountModalOpen(true);
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        servers={servers}
        currentUser={currentUser}
        onSelectServer={handleSelectServer}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onNavigate={handleNavigate}
        onOpenAccountModal={tab => {
          if (tab) setAccountModalTab(tab);
          setAccountModalOpen(true);
        }}
        onOpenAiDebugger={() => {
          setAiInitialLogs('');
          setAiDebuggerOpen(true);
        }}
        onOpenHealthMonitor={() => handleNavigate('admin-health')}
      />

      {/* Modals */}
      <CreateBotModal
        isOpen={createModalOpen}
        currentUser={currentUser}
        existingServersCount={servers.length}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleServerCreated}
      />

      {currentUser && (
        <AccountModal
          isOpen={accountModalOpen}
          user={currentUser}
          initialTab={accountModalTab}
          serversCount={servers.length}
          onClose={() => setAccountModalOpen(false)}
          onUserUpdated={updated => setCurrentUser(updated)}
          onLogout={handleLogout}
        />
      )}

      <AuthModal
        isOpen={authModalOpen || !currentUser}
        canClose={!!currentUser}
        onClose={() => {
          if (currentUser) {
            setAuthModalOpen(false);
            if (window.location.search.includes('auth')) {
              syncUrl(activeView, selectedServerId);
            }
          }
        }}
        onSuccess={user => {
          setCurrentUser(user);
          setAuthModalOpen(false);
          loadServersAndStats();
          syncUrl('dashboard');
        }}
      />

      <AiDebuggerModal
        isOpen={aiDebuggerOpen}
        onClose={() => setAiDebuggerOpen(false)}
        initialLogs={aiInitialLogs}
        currentServer={selectedServerId ? servers.find(s => s.id === selectedServerId) : null}
      />

      <HealthMonitorModal
        isOpen={healthMonitorOpen}
        onClose={() => setHealthMonitorOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}
