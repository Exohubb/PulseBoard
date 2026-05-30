import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { ArrowLeft, Play, Pause, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Activity, TrendingUp, TrendingDown, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';

interface Monitor {
  id: string;
  name: string;
  type: string;
  active: boolean;
  intervalSeconds: number;
  timeoutMs: number;
  slowThresholdMs: number;
  lastRunAt?: string;
  lastStatus?: string;
  consecutiveFailures: number;
  service?: { id: string; name: string };
  httpConfig?: { url: string; method: string; expectedStatus: number };
  wsConfig?: { url: string };
  scanConfig?: { url: string };
}

interface CheckRun {
  id: string;
  success: boolean;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  latencyTotalMs?: number;
  latencyConnectMs?: number;
  startedAt: string;
  durationMs?: number;
  availabilityState: string;
  assertions?: { name: string; passed: boolean; expected?: string; actual?: string }[];
}

interface UptimeStats {
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  totalChecks: number;
}

interface LatencyData {
  startedAt: string;
  latencyTotalMs: number | null;
  success: boolean;
}

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const [timeRange, setTimeRange] = useState('24h');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCheckModalOpen, setDeleteCheckModalOpen] = useState(false);
  const [deleteCheckId, setDeleteCheckId] = useState<string | null>(null);

  // Fetch monitor details
  const { data: monitor, isLoading: monitorLoading, refetch: refetchMonitor } = useQuery<Monitor>({
    queryKey: ['monitor', currentWorkspace?.slug, id],
    queryFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace or monitor');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/monitors/${id}`);
      return response.data;
    },
    enabled: !!currentWorkspace && !!id,
  });

  // Fetch recent checks/logs
  const { data: checks, isLoading: checksLoading, refetch: refetchChecks } = useQuery<CheckRun[]>({
    queryKey: ['checks', currentWorkspace?.slug, id, 'logs'],
    queryFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace or monitor');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/checks/monitor/${id}`, {
        params: { limit: 50 },
      });
      return response.data;
    },
    enabled: !!currentWorkspace && !!id,
  });

  // Fetch uptime stats
  const { data: uptimeStats, refetch: refetchUptime } = useQuery<UptimeStats>({
    queryKey: ['uptime', currentWorkspace?.slug, id],
    queryFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace or monitor');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/checks/monitor/${id}/uptime`);
      return response.data;
    },
    enabled: !!currentWorkspace && !!id,
  });

  // Fetch latency history for graph
  const { data: latencyHistory } = useQuery<LatencyData[]>({
    queryKey: ['latency', currentWorkspace?.slug, id, timeRange],
    queryFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace or monitor');
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/checks/monitor/${id}/latency`, {
        params: { days },
      });
      return response.data;
    },
    enabled: !!currentWorkspace && !!id,
  });

  // Delete check run mutation
  const deleteCheckMutation = useMutation({
    mutationFn: async (checkId: string) => {
      if (!currentWorkspace || !id) throw new Error('No workspace');
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/checks/${checkId}`);
      return response.data;
    },
    onSuccess: () => {
      refetchChecks();
      setDeleteCheckId(null);
    },
  });

  // Delete all check runs for monitor mutation
  const deleteAllChecksMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace');
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/checks/monitor/${id}`);
      return response.data;
    },
    onSuccess: () => {
      refetchChecks();
      refetchUptime();
      setDeleteCheckModalOpen(false);
    },
  });

  // Delete monitor mutation
  const deleteMonitorMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace');
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/monitors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      navigate('/app/monitors');
    },
  });

  // Pause/Resume mutation
  const pauseResumeMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !id) throw new Error('No workspace');
      const endpoint = monitor?.active ? 'pause' : 'resume';
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/monitors/${id}/${endpoint}`);
      return response.data;
    },
    onSuccess: () => {
      refetchMonitor();
    },
  });

  const handleRefresh = () => {
    refetchChecks();
    refetchUptime();
    refetchMonitor();
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (monitorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Monitor not found</h2>
        <Link to="/app/monitors">
          <Button variant="outline">Back to Monitors</Button>
        </Link>
      </div>
    );
  }

  const getMonitorUrl = () => {
    if (monitor.type === 'http' && monitor.httpConfig) return monitor.httpConfig.url;
    if (monitor.type === 'websocket' && monitor.wsConfig) return monitor.wsConfig.url;
    if (monitor.scanConfig) return monitor.scanConfig.url;
    return 'N/A';
  };

  const recentFailures = checks?.filter(c => !c.success).length || 0;
  const recentSlow = checks?.filter(c => c.availabilityState === 'slow').length || 0;
  const successRate = checks && checks.length > 0
    ? Math.round(((checks.length - recentFailures) / checks.length) * 100)
    : 100;

  // Simple latency chart data
  const maxLatency = latencyHistory?.reduce((max, d) => Math.max(max, d.latencyTotalMs || 0), 0) || 1000;

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'slow':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCheckColor = (check: CheckRun) => {
    if (!check.success) return 'bg-red-500';
    if (check.availabilityState === 'slow') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatTimeout = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/monitors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-gray-500" />
            <h1 className="text-2xl font-bold">{monitor.name}</h1>
            <StatusBadge status={monitor.lastStatus || 'unknown'} />
            {!monitor.active && <Badge variant="warning">Paused</Badge>}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {monitor.service?.name} • {monitor.type.toUpperCase()} • Every {formatInterval(monitor.intervalSeconds)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant={monitor.active ? 'ghost' : 'primary'} size="sm"
            onClick={() => pauseResumeMutation.mutate()}
            disabled={pauseResumeMutation.isPending}
          >
            {monitor.active ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteCheckModalOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Records
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(true)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-2xl font-bold mt-1">
                  <StatusBadge status={monitor.lastStatus || 'unknown'} />
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {getStatusIcon(monitor.lastStatus)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Uptime (24h)</p>
                <p className="text-2xl font-bold mt-1">{uptimeStats?.uptime24h ?? '--'}%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Latency</p>
                <p className="text-2xl font-bold mt-1">
                  {checks && checks.length > 0
                    ? Math.round(checks.reduce((sum, c) => sum + (c.latencyTotalMs || 0), 0) / checks.length)
                    : '--'} ms
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold mt-1">{successRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {successRate >= 99 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : successRate >= 95 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Slow Checks</p>
                <p className="text-2xl font-bold mt-1">{recentSlow}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latency Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Response Time</CardTitle>
          <div className="flex gap-2">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === range
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {latencyHistory && latencyHistory.length > 0 ? (
            <div className="h-48 relative">
              {/* Simple bar chart with slow indicator */}
              <div className="absolute top-2 left-2 z-10 flex gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Fast</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Slow</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Failed</span>
              </div>
              <div className="flex items-end gap-0.5 h-full pt-6">
                {latencyHistory.slice(-50).map((point, i) => {
                  let color = 'bg-green-500';
                  if (!point.success) color = 'bg-red-500';
                  else if (point.latencyTotalMs && monitor.slowThresholdMs && point.latencyTotalMs > monitor.slowThresholdMs) {
                    color = 'bg-yellow-500';
                  }
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${color}`}
                      style={{
                        height: `${Math.max(5, ((point.latencyTotalMs || 0) / maxLatency) * 100)}%`,
                        minHeight: '4px',
                      }}
                      title={`${new Date(point.startedAt).toLocaleString()}: ${point.latencyTotalMs || 0}ms`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0ms</span>
                <span className="text-yellow-500">Slow threshold: {monitor.slowThresholdMs}ms</span>
                <span>{maxLatency}ms (max)</span>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              <Activity className="h-8 w-8 mr-2" />
              No latency data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uptime Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">24 Hour Uptime</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {uptimeStats?.uptime24h ?? '--'}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">7 Day Uptime</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {uptimeStats?.uptime7d ?? '--'}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">30 Day Uptime</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {uptimeStats?.uptime30d ?? '--'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monitor Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Target URL</p>
              <p className="font-mono mt-1 break-all">{getMonitorUrl()}</p>
            </div>
            {monitor.type === 'http' && monitor.httpConfig && (
              <>
                <div>
                  <p className="text-gray-500">Method</p>
                  <p className="mt-1">{monitor.httpConfig.method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Expected Status</p>
                  <p className="mt-1">{monitor.httpConfig.expectedStatus}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-gray-500">Check Interval</p>
              <p className="mt-1">{formatInterval(monitor.intervalSeconds)}</p>
            </div>
            <div>
              <p className="text-gray-500">Timeout</p>
              <p className="mt-1">{formatTimeout(monitor.timeoutMs)}</p>
            </div>
            <div>
              <p className="text-gray-500">Slow Threshold</p>
              <p className="mt-1">{formatTimeout(monitor.slowThresholdMs)}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Check</p>
              <p className="mt-1">
                {monitor.lastRunAt
                  ? new Date(monitor.lastRunAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Consecutive Failures</p>
              <p className="mt-1">{monitor.consecutiveFailures}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Checks</CardTitle>
          <span className="text-sm text-gray-500">{checks?.length || 0} checks</span>
        </CardHeader>
        <CardContent>
          {checksLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : checks && checks.length > 0 ? (
            <div className="space-y-2">
              {checks.slice(0, 20).map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 group"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.success ? check.availabilityState : 'down')}
                    <div>
                      <p className="font-medium text-sm">
                        {check.success ? (
                          check.availabilityState === 'slow' ? (
                            <span className="text-yellow-600">Slow ({check.latencyTotalMs}ms)</span>
                          ) : (
                            <span className="text-green-600">Success</span>
                          )
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                        {check.statusCode && ` (${check.statusCode})`}
                      </p>
                      {check.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          {check.errorCode && <Badge variant="error" className="text-xs">{check.errorCode}</Badge>}
                          {check.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{new Date(check.startedAt).toLocaleString()}</span>
                    <button
                      onClick={() => { setDeleteCheckId(check.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              No checks recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Check Modal */}
      <Modal isOpen={!!deleteCheckId} onClose={() => setDeleteCheckId(null)}>
        <ModalHeader>Delete Check Record</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this check record? This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteCheckId(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => deleteCheckId && deleteCheckMutation.mutate(deleteCheckId)}
            isLoading={deleteCheckMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete All Checks Modal */}
      <Modal isOpen={deleteCheckModalOpen} onClose={() => setDeleteCheckModalOpen(false)}>
        <ModalHeader>Clear All Check Records</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            This will delete all check history for <strong>{monitor.name}</strong>. The monitor will remain active. This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteCheckModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => deleteAllChecksMutation.mutate()}
            isLoading={deleteAllChecksMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear All Records
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Monitor Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalHeader>Delete Monitor</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{monitor.name}</strong>? This will also delete all check history and cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => deleteMonitorMutation.mutate()}
            isLoading={deleteMonitorMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Monitor
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
