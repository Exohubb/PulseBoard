import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Plus, Activity, Play, Pause, Loader2, Trash2, Info, Settings, CheckCircle, ChevronDown, AlertCircle } from 'lucide-react';

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
  service?: { id: string; name: string };
}

interface Service {
  id: string;
  name: string;
}

interface FieldInfo {
  title: string;
  description: string;
}

const fieldInfo: Record<string, FieldInfo> = {
  name: {
    title: 'Monitor Name',
    description: 'A friendly name to identify this monitor. Example: "API Health Check"'
  },
  type: {
    title: 'Monitor Type',
    description: 'HTTP: Checks URL reachability. WebSocket: Checks real-time connection.'
  },
  service: {
    title: 'Service',
    description: 'Group this monitor under a service for better organization.'
  },
  url: {
    title: 'URL to Monitor',
    description: 'Full URL with http://, https://, ws://, or wss:// protocol.'
  },
  interval: {
    title: 'Check Interval',
    description: 'How often to check the endpoint. Min: 60 seconds.'
  },
  timeout: {
    title: 'Request Timeout',
    description: 'Max wait time before marking check as failed.'
  },
  retries: {
    title: 'Max Retries',
    description: 'Consecutive failures before marking monitor as down.'
  },
  slowThreshold: {
    title: 'Slow Response Threshold',
    description: 'Response above this = "slow" (but still up).'
  },
  expectedStatus: {
    title: 'Expected Status Code',
    description: 'HTTP status code for successful response. Default: 200.'
  },
  customHeaders: {
    title: 'Custom Headers',
    description: 'Add custom HTTP headers as JSON. {"Header": "value"}'
  }
};

function InfoTooltip({ field }: { field: string }) {
  const [show, setShow] = useState(false);
  const info = fieldInfo[field];

  if (!info) return null;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-primary-500 transition-colors p-0.5"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
          <p className="font-semibold mb-1">{info.title}</p>
          <p className="text-gray-300 leading-relaxed">{info.description}</p>
        </div>
      )}
    </div>
  );
}

interface CustomInputProps {
  value: number;
  onChange: (value: number) => void;
  presets: { value: number; label: string }[];
  label: string;
  field: string;
  min: number;
  max: number;
  unit?: string;
}

function CustomSelect({ value, onChange, presets, label, field, min, max, unit }: CustomInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customMode, setCustomMode] = useState(!presets.some(p => p.value === value));
  const [customValue, setCustomValue] = useState(customMode ? value.toString() : '');

  const selectedPreset = presets.find(p => p.value === value);
  const displayValue = selectedPreset ? selectedPreset.label : `${value}${unit || ''}`;

  const handlePresetSelect = (presetValue: number) => {
    onChange(presetValue);
    setCustomMode(false);
    setShowDropdown(false);
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    const numVal = parseInt(val);
    if (!isNaN(numVal) && numVal >= min && numVal <= max) {
      onChange(numVal);
    }
  };

  const handleCustomBlur = () => {
    if (!customValue || parseInt(customValue) < min) {
      setCustomValue(min.toString());
      onChange(min);
    } else if (parseInt(customValue) > max) {
      setCustomValue(max.toString());
      onChange(max);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} <InfoTooltip field={field} />
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {customMode ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customValue}
                onChange={(e) => handleCustomChange(e.target.value)}
                onBlur={handleCustomBlur}
                min={min}
                max={max}
                className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  if (presets.length > 0) {
                    onChange(presets[0].value);
                  }
                }}
                className="h-9 px-2 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
              >
                Use Preset
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-left flex items-center justify-between hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <span className="text-gray-900 dark:text-gray-100">{displayValue}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          )}

          {showDropdown && !customMode && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode(true);
                    setCustomValue(value.toString());
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                >
                  + Use Custom Value
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <div className="p-1">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`w-full px-3 py-2 text-sm text-left rounded-lg ${
                      value === preset.value
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MonitorsPage() {
  const { currentWorkspace, fetchWorkspaces, isLoading: workspaceLoading } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [deleteCheckModalOpen, setDeleteCheckModalOpen] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'http',
    serviceId: '',
    url: '',
    intervalSeconds: 60,
    timeoutMs: 30000,
    retryCount: 3,
    slowThresholdMs: 1000,
    expectedStatus: 200,
    customHeaders: '',
  });

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'http',
      serviceId: '',
      url: '',
      intervalSeconds: 60,
      timeoutMs: 30000,
      retryCount: 3,
      slowThresholdMs: 1000,
      expectedStatus: 200,
      customHeaders: '',
    });
    setShowAdvanced(false);
  };

  const { data: monitors, isLoading: monitorsLoading, refetch: refetchMonitors } = useQuery<Monitor[]>({
    queryKey: ['monitors', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/monitors`);
      return response.data;
    },
    enabled: !!currentWorkspace,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ['services', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/services`);
      return response.data;
    },
    enabled: !!currentWorkspace,
  });

  const pauseResumeMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const endpoint = active ? 'pause' : 'resume';
      if (!currentWorkspace) throw new Error('No workspace');
      console.log(`Calling ${endpoint} for monitor ${id}`);
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/monitors/${id}/${endpoint}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors', currentWorkspace?.slug] });
      setActionError(null);
    },
    onError: (error: any) => {
      console.error('Pause/Resume error:', error);
      setActionError(error?.response?.data?.message || error.message || 'Failed to update monitor');
    },
  });

  const deleteMonitorMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      await api.delete(`/workspaces/${currentWorkspace.slug}/checks/monitor/${id}`);
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/monitors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors', currentWorkspace?.slug] });
      setDeleteModalOpen(null);
      setActionError(null);
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      setActionError(error?.response?.data?.message || error.message || 'Failed to delete monitor');
    },
  });

  const deleteCheckRunsMutation = useMutation({
    mutationFn: async (monitorId: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/checks/monitor/${monitorId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks', currentWorkspace?.slug] });
      setDeleteCheckModalOpen(null);
      setActionError(null);
    },
    onError: (error: any) => {
      console.error('Delete checks error:', error);
      setActionError(error?.response?.data?.message || error.message || 'Failed to delete checks');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/monitors`, data);
      return response.data;
    },
    onSuccess: async (data) => {
      if (data?.id) {
        if (formData.type === 'http') {
          await api.post(`/workspaces/${currentWorkspace?.slug}/monitors/${data.id}/http-config`, {
            url: formData.url,
            method: 'GET',
            expectedStatus: formData.expectedStatus,
            followRedirects: true,
            sslStrict: false,
            headers: formData.customHeaders || '{}',
          });
        } else if (formData.type === 'websocket') {
          await api.post(`/workspaces/${currentWorkspace?.slug}/monitors/${data.id}/ws-config`, {
            url: formData.url,
            connectTimeoutMs: formData.timeoutMs,
            headers: formData.customHeaders || '{}',
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['monitors', currentWorkspace?.slug] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      setActionError(error?.response?.data?.message || error.message || 'Failed to create monitor');
    },
  });

  const handleCreateMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      serviceId: formData.serviceId,
      active: true,
      intervalSeconds: formData.intervalSeconds,
      timeoutMs: formData.timeoutMs,
      retryCount: formData.retryCount,
      slowThresholdMs: formData.slowThresholdMs,
    });
  };

  const handlePauseResume = (monitor: Monitor, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    pauseResumeMutation.mutate({ id: monitor.id, active: monitor.active });
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatTimeout = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(0)}s`;
  };

  const formatSlow = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const intervalOptions = [
    { value: 60, label: 'Every 1 minute' },
    { value: 120, label: 'Every 2 minutes' },
    { value: 300, label: 'Every 5 minutes' },
    { value: 600, label: 'Every 10 minutes' },
    { value: 900, label: 'Every 15 minutes' },
    { value: 1800, label: 'Every 30 minutes' },
    { value: 3600, label: 'Every 1 hour' },
    { value: 7200, label: 'Every 2 hours' },
    { value: 10800, label: 'Every 3 hours' },
  ];

  const timeoutOptions = [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '60 seconds' },
    { value: 120000, label: '2 minutes' },
  ];

  const retryOptions = [
    { value: 1, label: '1 retry' },
    { value: 2, label: '2 retries' },
    { value: 3, label: '3 retries' },
    { value: 5, label: '5 retries' },
    { value: 10, label: '10 retries' },
  ];

  const slowOptions = [
    { value: 200, label: '200ms' },
    { value: 500, label: '500ms' },
    { value: 1000, label: '1 second' },
    { value: 2000, label: '2 seconds' },
    { value: 3000, label: '3 seconds' },
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
  ];

  const statusOptions = [
    { value: 200, label: '200 OK' },
    { value: 201, label: '201 Created' },
    { value: 204, label: '204 No Content' },
    { value: 301, label: '301 Redirect' },
    { value: 302, label: '302 Found' },
    { value: 400, label: '400 Bad Request' },
    { value: 401, label: '401 Unauthorized' },
    { value: 404, label: '404 Not Found' },
  ];

  const isLoading = workspaceLoading || monitorsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitors</h1>
          <p className="text-gray-500 text-sm">Configure and manage your monitors</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Monitor
        </Button>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !currentWorkspace ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Loading workspace...</h3>
            <p className="text-gray-500">Please wait while we load your data.</p>
          </CardContent>
        </Card>
      ) : !monitors || monitors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No monitors yet</h3>
            <p className="text-gray-500 mb-4">Create your first monitor to start tracking your services</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Monitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Interval</th>
                    <th className="px-4 py-3 font-medium">Last Run</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {monitors.map((monitor) => (
                    <tr
                      key={monitor.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => navigate(`/app/monitors/${monitor.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          {monitor.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{monitor.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{monitor.service?.name || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={monitor.lastStatus || 'unknown'} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatInterval(monitor.intervalSeconds)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {monitor.lastRunAt ? new Date(monitor.lastRunAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handlePauseResume(monitor, e)}
                            disabled={pauseResumeMutation.isPending}
                            title={monitor.active ? 'Pause' : 'Resume'}
                          >
                            {monitor.active ? (
                              <Pause className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Play className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCheckModalOpen(monitor.id);
                            }}
                            title="Clear check history"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalOpen(monitor.id);
                            }}
                            title="Delete monitor"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Monitor Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-500" />
            <span>Create Monitor</span>
          </div>
        </ModalHeader>
        <form onSubmit={handleCreateMonitor}>
          <ModalBody className="space-y-5">
            {/* Monitor Name */}
            <div className="space-y-1.5">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                Monitor Name <span className="text-red-500 ml-1">*</span>
                <InfoTooltip field="name" />
              </label>
              <Input
                placeholder="e.g., API Health Check"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                required
              />
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                URL to Monitor <span className="text-red-500 ml-1">*</span>
                <InfoTooltip field="url" />
              </label>
              <Input
                type="url"
                placeholder={formData.type === 'http' ? 'https://api.example.com/health' : 'wss://ws.example.com'}
                value={formData.url}
                onChange={(e) => updateForm('url', e.target.value)}
                required
              />
              {formData.url && (
                <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Will monitor: <span className="font-mono font-medium">{formData.url}</span>
                </p>
              )}
            </div>

            {/* Type and Service Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type <InfoTooltip field="type" />
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => updateForm('type', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="http">HTTP</option>
                  <option value="websocket">WebSocket</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service <span className="text-red-500 ml-1">*</span> <InfoTooltip field="service" />
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => updateForm('serviceId', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  required
                >
                  <option value="">Select...</option>
                  {services?.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Settings - With Custom Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Check Interval"
                field="interval"
                value={formData.intervalSeconds}
                onChange={(v) => updateForm('intervalSeconds', v)}
                presets={intervalOptions}
                min={60}
                max={10800}
                unit="sec"
              />
              <CustomSelect
                label="Request Timeout"
                field="timeout"
                value={formData.timeoutMs}
                onChange={(v) => updateForm('timeoutMs', v)}
                presets={timeoutOptions}
                min={1000}
                max={120000}
                unit="ms"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Max Retries"
                field="retries"
                value={formData.retryCount}
                onChange={(v) => updateForm('retryCount', v)}
                presets={retryOptions}
                min={1}
                max={10}
              />
              <CustomSelect
                label="Slow Threshold"
                field="slowThreshold"
                value={formData.slowThresholdMs}
                onChange={(v) => updateForm('slowThresholdMs', v)}
                presets={slowOptions}
                min={100}
                max={60000}
                unit="ms"
              />
            </div>

            {/* Expected Status for HTTP */}
            {formData.type === 'http' && (
              <CustomSelect
                label="Expected Status Code"
                field="expectedStatus"
                value={formData.expectedStatus}
                onChange={(v) => updateForm('expectedStatus', v)}
                presets={statusOptions}
                min={100}
                max={599}
              />
            )}

            {/* Advanced Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Settings className="h-4 w-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                <div className="space-y-1.5">
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Headers <InfoTooltip field="customHeaders" />
                  </label>
                  <textarea
                    placeholder='{"Authorization": "Bearer token"}'
                    value={formData.customHeaders}
                    onChange={(e) => updateForm('customHeaders', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-3">Configuration Summary</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500"> Interval:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatInterval(formData.intervalSeconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timeout:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatTimeout(formData.timeoutMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slow:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">&gt;{formatSlow(formData.slowThresholdMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Retries:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formData.retryCount}</span>
                </div>
                {formData.type === 'http' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formData.expectedStatus}</span>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Monitor
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Monitor Modal */}
      <Modal isOpen={!!deleteModalOpen} onClose={() => setDeleteModalOpen(null)} size="sm">
        <ModalHeader>Delete Monitor</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Delete this monitor and all its check history? This cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(null)}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => deleteModalOpen && deleteMonitorMutation.mutate(deleteModalOpen)}
            isLoading={deleteMonitorMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Checks Modal */}
      <Modal isOpen={!!deleteCheckModalOpen} onClose={() => setDeleteCheckModalOpen(null)} size="sm">
        <ModalHeader>Clear Check History</ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Delete all check records for this monitor? The monitor will remain active.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteCheckModalOpen(null)}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => deleteCheckModalOpen && deleteCheckRunsMutation.mutate(deleteCheckModalOpen)}
            isLoading={deleteCheckRunsMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
