import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  Play,
  Clock,
  Loader2,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'pass' | 'fail' | 'warning' | 'info' | 'skipped' | 'not_testable';
  evidence?: string;
  recommendation?: string;
  cweOwaspReference?: string;
  skippedReason?: string;
}

interface ScanRun {
  id: string;
  monitorId?: string;
  url: string;
  score: number;
  verdict: 'secure' | 'warning' | 'vulnerable' | 'inconclusive';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  findings?: Finding[];
}

export function ScannerPage() {
  const { currentWorkspace, fetchWorkspaces, isLoading: workspaceLoading } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // Scan options
  const [authType, setAuthType] = useState<'none' | 'header' | 'message' | 'query'>('none');
  const [authValue, setAuthValue] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [maxDurationMs, setMaxDurationMs] = useState(30000);
  const [maxMessages, setMaxMessages] = useState(50);
  const [legalAck, setLegalAck] = useState(false);
  const [ownershipAck, setOwnershipAck] = useState(false);
  const [checks, setChecks] = useState({
    allowAuthChecks: true,
    allowOriginChecks: true,
    allowSchemaFuzz: false,
    allowRateLimitProbe: false,
    allowEventEnumProbe: false,
    allowPayloadSizeProbe: false,
  });

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const { data: scanRuns, isLoading: runsLoading, refetch: refetchRuns } = useQuery<ScanRun[]>({
    queryKey: ['scanRuns', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.id}/scanner/runs`);
      return response.data || [];
    },
    enabled: !!currentWorkspace,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: selectedScan, isLoading: scanLoading, refetch: refetchScan } = useQuery<ScanRun>({
    queryKey: ['scanRun', currentWorkspace?.id, selectedScanId],
    queryFn: async () => {
      if (!currentWorkspace || !selectedScanId) throw new Error('No scan selected');
      const response = await api.get(`/workspaces/${currentWorkspace.id}/scanner/runs/${selectedScanId}`);
      return response.data;
    },
    enabled: !!currentWorkspace && !!selectedScanId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: findings } = useQuery<Finding[]>({
    queryKey: ['scanFindings', currentWorkspace?.id, selectedScanId],
    queryFn: async () => {
      if (!currentWorkspace || !selectedScanId) throw new Error('No scan selected');
      const response = await api.get(`/workspaces/${currentWorkspace.id}/scanner/runs/${selectedScanId}/findings`);
      return response.data || [];
    },
    enabled: !!currentWorkspace && !!selectedScanId,
  });

  const runScanMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      let parsedHeaders: Record<string, string> | undefined;
      if (headersText.trim()) {
        try {
          parsedHeaders = JSON.parse(headersText);
        } catch {
          throw new Error('Headers must be valid JSON');
        }
      }
      const authConfig: Record<string, string> = {};
      if (authType !== 'none' && authValue) {
        if (authType === 'header') authConfig.token = authValue;
        else if (authType === 'message') authConfig.message = authValue;
        else if (authType === 'query') authConfig.token = authValue;
      }
      const response = await api.post(`/workspaces/${currentWorkspace.id}/scanner/run`, {
        url: targetUrl,
        headers: parsedHeaders,
        authType,
        authConfig,
        maxDurationMs,
        maxMessages,
        legalAcknowledged: legalAck,
        ownershipConfirmed: ownershipAck,
        ...checks,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSelectedScanId(data.id);
      setActiveTab('history');
      queryClient.invalidateQueries({ queryKey: ['scanRuns', currentWorkspace?.id] });
      setTargetUrl('');
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || error.message || 'Failed to start scan');
    },
  });

  const deleteScanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      await api.delete(`/workspaces/${currentWorkspace.id}/scanner/runs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanRuns', currentWorkspace?.id] });
      if (selectedScanId === showDeleteModal) {
        setSelectedScanId(null);
      }
      setShowDeleteModal(null);
      setActionError(null);
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || error.message || 'Failed to delete scan');
    },
  });

  // Poll for scan completion
  useEffect(() => {
    if (!selectedScan || selectedScan.status === 'completed' || selectedScan.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(() => {
      refetchScan();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [selectedScan?.status, selectedScanId, refetchScan]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'secure':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'vulnerable':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge variant="success">Pass</Badge>;
      case 'fail':
        return <Badge variant="error">Fail</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'skipped':
        return <Badge variant="default">Skipped</Badge>;
      case 'not_testable':
        return <Badge variant="default">N/A</Badge>;
      default:
        return <Badge variant="info">Info</Badge>;
    }
  };

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;
    if (!ownershipAck) {
      setActionError('You must confirm you own the target endpoint.');
      return;
    }
    if (!legalAck) {
      setActionError('You must acknowledge the legal notice.');
      return;
    }
    runScanMutation.mutate();
  };

  const openScanDetails = (scanId: string) => {
    setSelectedScanId(scanId);
    setActiveTab('history');
  };

  const isLoading = workspaceLoading || runsLoading || runScanMutation.isPending;

  // Display data - merge findings from API response with separate findings query
  const displayScan = selectedScan;
  const displayFindings = findings || selectedScan?.findings || [];
  const criticalCount = displayFindings.filter(f => f.severity === 'critical' || f.severity === 'high' && f.status === 'fail').length;
  const warningCount = displayFindings.filter(f => f.severity === 'medium' && f.status === 'fail').length;

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WebSocket Security Scanner</h1>
        <p className="text-gray-500">Scan your WebSocket endpoints for security issues</p>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Safety Notice */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Safety First</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                This scanner performs safe, non-destructive tests only. You must confirm ownership of any endpoints you scan.
                No denial-of-service behavior or credential brute-forcing is performed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('new')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'new'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          New Scan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Scan History ({scanRuns?.length || 0})
        </button>
      </div>

      {/* New Scan Form */}
      {activeTab === 'new' && (
        <Card>
          <CardHeader>
            <CardTitle>Start New Scan</CardTitle>
          </CardHeader>
          <form onSubmit={handleStartScan}>
            <CardContent className="space-y-6">
              <Input
                label="Target URL"
                placeholder="wss://your-websocket-endpoint.com/socket"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                hint="Enter the WebSocket URL to scan (must be an endpoint you own)"
                required
              />

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Authentication
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {(['none', 'header', 'message', 'query'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAuthType(t)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${
                        authType === t
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {t === 'none' ? 'No auth' : t === 'header' ? 'Bearer header' : t === 'message' ? 'Auth message' : 'Query token'}
                    </button>
                  ))}
                </div>
                {authType === 'header' && (
                  <Input
                    label="Bearer token"
                    placeholder="eyJhbGc..."
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    hint="Sent as Authorization: Bearer <token> on the upgrade request"
                  />
                )}
                {authType === 'message' && (
                  <Input
                    label="Auth message (JSON)"
                    placeholder='{"event":"auth","token":"…"}'
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    hint="Sent as the first message after connection"
                  />
                )}
                {authType === 'query' && (
                  <Input
                    label="Token"
                    placeholder="abc123…"
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    hint="Appended to the URL as ?token=… (the scanner will flag this if leaked in logs)"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Custom headers (JSON, optional)
                </label>
                <textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  placeholder='{"X-Region":"us-east"}'
                  className="w-full h-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Max duration (ms)"
                  type="number"
                  min={5000}
                  max={120000}
                  value={maxDurationMs}
                  onChange={(e) => setMaxDurationMs(Number(e.target.value))}
                  hint="Hard cap on total scan time"
                />
                <Input
                  label="Max messages"
                  type="number"
                  min={5}
                  max={500}
                  value={maxMessages}
                  onChange={(e) => setMaxMessages(Number(e.target.value))}
                  hint="Across all checks combined"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Checks to run</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {([
                    { key: 'allowAuthChecks', label: 'Authentication required', hint: 'Verifies endpoint refuses unauthenticated connections' },
                    { key: 'allowOriginChecks', label: 'Origin handling', hint: 'Tests Origin header validation' },
                    { key: 'allowSchemaFuzz', label: 'Schema validation (fuzz)', hint: 'Sends malformed JSON to test parser robustness' },
                    { key: 'allowRateLimitProbe', label: 'Rate limiting', hint: 'Sends bursts to detect connection-level limits' },
                    { key: 'allowEventEnumProbe', label: 'Event enumeration', hint: 'Probes for hidden event names from a small allow-list' },
                    { key: 'allowPayloadSizeProbe', label: 'Payload size limits', hint: 'Tests how the server reacts to oversized frames' },
                  ] as const).map((c) => (
                    <label
                      key={c.key}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(checks as any)[c.key]}
                        onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-gray-500">{c.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ownershipAck}
                    onChange={(e) => setOwnershipAck(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <strong>I confirm I own this endpoint</strong> or have explicit written permission to scan it.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalAck}
                    onChange={(e) => setLegalAck(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <strong>I acknowledge</strong> unauthorized scanning may violate the Computer Fraud and Abuse Act (US) or equivalent laws.
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={!targetUrl || runScanMutation.isPending}>
                  {runScanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Scan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Scan History & Details */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scan List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Scan History</CardTitle>
                <button
                  onClick={() => refetchRuns()}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {runsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : scanRuns && scanRuns.length > 0 ? (
                  <div className="divide-y dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                    {scanRuns.map((run) => (
                      <div
                        key={run.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          selectedScanId === run.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                        onClick={() => openScanDetails(run.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{run.url}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(run.startedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getVerdictColor(run.verdict)}`}>
                              <span className="text-xs font-bold">{run.score}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(run.id);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={
                              run.verdict === 'secure' ? 'success' :
                              run.verdict === 'warning' ? 'warning' :
                              run.verdict === 'vulnerable' ? 'error' : 'default'
                            }
                            className="text-xs"
                          >
                            {run.status === 'in_progress' || run.status === 'pending' ? 'Scanning...' : run.verdict}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No scans yet</p>
                    <p className="text-xs mt-1">Start a new scan to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scan Details */}
          <div className="lg:col-span-2">
            {selectedScanId && displayScan ? (
              <>
                {/* Score Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getVerdictColor(displayScan.verdict)}`}>
                          {displayScan.status === 'in_progress' || displayScan.status === 'pending' ? (
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                          ) : (
                            <span className="text-2xl font-bold">{displayScan.score}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold capitalize">
                            {displayScan.status === 'in_progress' || displayScan.status === 'pending'
                              ? 'Scanning...'
                              : displayScan.verdict}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {displayScan.url}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(displayScan.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchScan()}
                          disabled={scanLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${scanLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteModal(selectedScanId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    {(displayScan.status === 'completed' || displayScan.status === 'failed') && (
                      <div className="flex gap-6 mt-4 pt-4 border-t dark:border-gray-700">
                        <div>
                          <p className="text-sm text-gray-500">Critical/High Issues</p>
                          <p className="text-xl font-bold text-red-600">{criticalCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Warnings</p>
                          <p className="text-xl font-bold text-yellow-600">{warningCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Findings</p>
                          <p className="text-xl font-bold">{displayFindings.length}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Findings */}
                {displayFindings.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Findings ({displayFindings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {displayFindings.map((finding, index) => (
                          <div
                            key={`${finding.id}-${index}`}
                            className="p-4 rounded-lg border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getSeverityIcon(finding.severity)}
                                <div>
                                  <p className="font-medium">{finding.title}</p>
                                  <p className="text-sm text-gray-500 capitalize">
                                    {finding.category.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  finding.severity === 'critical' ? 'error' :
                                  finding.severity === 'high' ? 'error' :
                                  finding.severity === 'medium' ? 'warning' :
                                  finding.severity === 'low' ? 'info' :
                                  'default'
                                }>
                                  {finding.severity}
                                </Badge>
                                {getStatusBadge(finding.status)}
                              </div>
                            </div>

                            {finding.status === 'skipped' && finding.skippedReason && (
                              <p className="text-sm text-gray-400 italic mb-2">
                                Skipped: {finding.skippedReason}
                              </p>
                            )}

                            {finding.evidence && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {finding.evidence}
                              </p>
                            )}

                            {finding.recommendation && (
                              <div className="mt-3 p-3 rounded-lg bg-white dark:bg-gray-900">
                                <p className="text-sm font-medium mb-1 text-primary-600 dark:text-primary-400">Recommendation</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {finding.recommendation}
                                </p>
                              </div>
                            )}

                            {finding.cweOwaspReference && (
                              <p className="text-xs text-gray-400 mt-2">
                                {finding.cweOwaspReference}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No Findings */}
                {displayFindings.length === 0 && (displayScan.status === 'completed' || displayScan.status === 'failed') && (
                  <Card className="mt-4">
                    <CardContent className="p-6 text-center text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No findings recorded for this scan</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">Select a scan to view details</p>
                  <p className="text-sm mt-1">Or start a new scan from the New Scan tab</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} size="sm">
        <ModalHeader>Delete Scan</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Are you sure you want to delete this scan result? This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(null)}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => showDeleteModal && deleteScanMutation.mutate(showDeleteModal)}
            isLoading={deleteScanMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
