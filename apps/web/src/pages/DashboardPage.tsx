import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../lib/utils';
import {
  Activity,
  Server,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface DashboardStats {
  totalServices: number;
  totalMonitors: number;
  activeIncidents: number;
  failingMonitors: number;
  avgLatency: number;
  uptime24h: number;
}

interface Service {
  id: string;
  name: string;
  status: string;
  uptime24h: number;
  monitors: { id: string; lastStatus: string }[];
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
}

interface CheckRun {
  id: string;
  success: boolean;
  latencyTotalMs: number;
  startedAt: string;
  monitor: { name: string };
}

export function DashboardPage() {
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (!currentWorkspace) {
      fetchWorkspaces();
    }
  }, [currentWorkspace, fetchWorkspaces]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/stats`);
      return response.data as DashboardStats;
    },
    enabled: !!currentWorkspace,
  });

  const servicesQuery = useQuery({
    queryKey: ['services', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/services`);
      return response.data as Service[];
    },
    enabled: !!currentWorkspace,
  });

  const incidentsQuery = useQuery({
    queryKey: ['incidents', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/incidents`);
      return response.data as Incident[];
    },
    enabled: !!currentWorkspace,
  });

  const recentChecksQuery = useQuery({
    queryKey: ['recent-checks', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/checks/recent?limit=10`);
      return response.data as CheckRun[];
    },
    enabled: !!currentWorkspace,
  });

  if (!currentWorkspace || statsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (statsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  const stats = statsQuery.data || {
    totalServices: 0,
    totalMonitors: 0,
    activeIncidents: 0,
    failingMonitors: 0,
    avgLatency: 0,
    uptime24h: 100,
  };

  const services = servicesQuery.data || [];
  const incidents = incidentsQuery.data || [];
  const recentChecks = recentChecksQuery.data || [];

  const activeIncidents = incidents.filter(i => ['open', 'investigating', 'identified', 'monitoring'].includes(i.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time overview of your infrastructure</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Server className="h-5 w-5" />}
          label="Services"
          value={stats.totalServices}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Monitors"
          value={stats.totalMonitors}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Active Incidents"
          value={stats.activeIncidents}
          highlight={stats.activeIncidents > 0}
          variant="error"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Failing"
          value={stats.failingMonitors}
          highlight={stats.failingMonitors > 0}
          variant="warning"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Latency"
          value={`${stats.avgLatency}ms`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Uptime 24h"
          value={`${stats.uptime24h}%`}
          variant={stats.uptime24h >= 99 ? 'success' : stats.uptime24h >= 95 ? 'warning' : 'error'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Services Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No services configured yet</p>
            ) : (
              <div className="space-y-3">
                {services.map((service) => {
                  const failingMonitors = service.monitors.filter(m => m.lastStatus === 'down').length;
                  const totalMonitors = service.monitors.length;

                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          service.status === 'up' ? 'bg-green-500' : service.status === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                        )} />
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-gray-500">
                            {totalMonitors} monitor{totalMonitors !== 1 ? 's' : ''}
                            {failingMonitors > 0 && ` · ${failingMonitors} failing`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={service.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-gray-500">No active incidents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeIncidents.slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{incident.title}</p>
                      <SeverityBadge severity={incident.severity} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(incident.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentChecks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No check runs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-800">
                    <th className="pb-3 font-medium">Monitor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Latency</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentChecks.map((check) => (
                    <tr key={check.id} className="border-b dark:border-gray-800 last:border-0">
                      <td className="py-3">{check.monitor.name}</td>
                      <td className="py-3">
                        {check.success ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" /> Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{check.latencyTotalMs}ms</td>
                      <td className="py-3 text-gray-500">
                        {new Date(check.startedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
  variant?: 'success' | 'warning' | 'error';
}) {
  const variantStyles = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  };

  return (
    <Card className={cn(highlight && 'ring-2 ring-red-500/50')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={cn('text-2xl font-bold', variant && variantStyles[variant])}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}