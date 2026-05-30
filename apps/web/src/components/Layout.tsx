import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';
import { useRealtimeStore } from '../lib/realtime';
import { useWorkspaceStore } from '../lib/workspace-store';
import { useThemeStore } from '../lib/theme-store';
import {
  LayoutDashboard,
  Server,
  Activity,
  AlertTriangle,
  Bell,
  Scan,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Services', href: '/app/services', icon: Server },
  { name: 'Monitors', href: '/app/monitors', icon: Activity },
  { name: 'Incidents', href: '/app/incidents', icon: AlertTriangle },
  { name: 'Alerts', href: '/app/alerts', icon: Bell },
  { name: 'Scanner', href: '/app/scanner', icon: Scan },
  { name: 'Status Pages', href: '/app/status-pages', icon: Globe },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isConnected, connect, disconnect } = useRealtimeStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) fetchWorkspaces();
  }, [currentWorkspace, fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      connect(currentWorkspace.id);
    }
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div
          className="fixed inset-0 bg-gray-900/50"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900">
          <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-800">
            <span className="text-lg font-semibold">PulseBoard</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 items-center px-6 border-b dark:border-gray-800">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">PulseBoard</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.href
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t dark:border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full mt-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 px-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 lg:px-8">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            )} />
            <span className="text-gray-600 dark:text-gray-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`Current: ${theme}`}
          >
            {theme === 'light' && <Sun className="h-5 w-5 text-gray-600" />}
            {theme === 'dark' && <Moon className="h-5 w-5 text-gray-400" />}
            {theme === 'system' && <Monitor className="h-5 w-5 text-gray-500" />}
          </button>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}