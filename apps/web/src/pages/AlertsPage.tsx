import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input, Textarea } from '../components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Plus,
  Bell,
  Slack,
  Mail,
  Webhook,
  Trash2,
  Send,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react';

type ChannelType = 'email' | 'slack' | 'webhook' | 'discord';

interface AlertChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config?: Record<string, any>;
}

interface AlertPolicy {
  id: string;
  name: string;
  event: string;
  severity?: string;
  enabled: boolean;
  alertChannelIds: string[];
  cooldownMinutes?: number;
}

const CHANNEL_TEMPLATES: Record<ChannelType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; placeholder: string; type?: string; hint?: string }[];
  setup: { title: string; steps: { text: string; href?: string }[] };
}> = {
  email: {
    label: 'Email',
    icon: Mail,
    fields: [
      { key: 'email', label: 'Email address', placeholder: 'team@example.com', type: 'email', hint: 'Comma-separate multiple recipients' },
    ],
    setup: {
      title: 'Email setup',
      steps: [
        { text: 'Configure SMTP credentials in your server .env (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM).' },
        { text: 'Multiple recipients can be entered comma-separated.' },
        { text: 'Use the Test button after creating the channel to confirm delivery.' },
      ],
    },
  },
  slack: {
    label: 'Slack',
    icon: Slack,
    fields: [
      { key: 'webhookUrl', label: 'Slack webhook URL', placeholder: 'https://hooks.slack.com/services/T00/B00/XXXX', hint: 'Incoming webhook URL from your Slack app' },
      { key: 'channel', label: 'Channel override (optional)', placeholder: '#alerts', hint: 'Leave empty to use the webhook default' },
    ],
    setup: {
      title: 'Slack setup',
      steps: [
        { text: 'Open your Slack workspace and go to Apps → Manage → Incoming Webhooks.', href: 'https://api.slack.com/apps' },
        { text: 'Create a new app, enable Incoming Webhooks, then add a webhook to a channel.' },
        { text: 'Copy the webhook URL (https://hooks.slack.com/services/...) and paste above.' },
      ],
    },
  },
  discord: {
    label: 'Discord',
    icon: Bell,
    fields: [
      { key: 'webhookUrl', label: 'Discord webhook URL', placeholder: 'https://discord.com/api/webhooks/000/xxxx' },
    ],
    setup: {
      title: 'Discord setup',
      steps: [
        { text: 'In your Discord server, open Channel settings → Integrations → Webhooks → New webhook.' },
        { text: 'Pick a channel, copy the webhook URL.' },
        { text: 'PulseBoard will POST a JSON payload with the alert title, severity, and message.' },
      ],
    },
  },
  webhook: {
    label: 'Webhook',
    icon: Webhook,
    fields: [
      { key: 'url', label: 'Endpoint URL', placeholder: 'https://your-server.com/hook' },
      { key: 'secret', label: 'Shared secret (optional)', placeholder: 'used for HMAC signature header', hint: 'Sent as X-PulseBoard-Signature: sha256=…' },
    ],
    setup: {
      title: 'Webhook setup',
      steps: [
        { text: 'Build any HTTPS endpoint that accepts POST.' },
        { text: 'Optionally provide a shared secret. Verify HMAC-SHA256 of the body against the X-PulseBoard-Signature header.' },
        { text: 'Payload: { event, severity, title, message, incident, timestamp }.' },
      ],
    },
  },
};

const POLICY_TEMPLATES = [
  {
    id: 'critical_only',
    name: 'Critical incidents (recommended)',
    event: 'incident_created',
    severity: 'critical',
    cooldownMinutes: 0,
    description: 'Page owners the moment a critical incident is opened.',
  },
  {
    id: 'all_high',
    name: 'High severity and above',
    event: 'incident_created',
    severity: 'high',
    cooldownMinutes: 15,
    description: 'Notifies for high/critical incidents with a 15-minute cooldown.',
  },
  {
    id: 'monitor_down',
    name: 'Any monitor goes down',
    event: 'monitor_down',
    severity: '',
    cooldownMinutes: 5,
    description: 'Fires whenever a monitor crosses its failure threshold.',
  },
  {
    id: 'recovery',
    name: 'Recovery confirmations',
    event: 'monitor_recovered',
    severity: '',
    cooldownMinutes: 0,
    description: 'Quiet but useful — sends an "all clear" when monitors come back.',
  },
  {
    id: 'resolved',
    name: 'Incident resolved',
    event: 'incident_resolved',
    severity: '',
    cooldownMinutes: 0,
    description: 'Tells the team when something gets resolved.',
  },
];

export function AlertsPage() {
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const queryClient = useQueryClient();

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [showSetupFor, setShowSetupFor] = useState<ChannelType | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [newChannel, setNewChannel] = useState<{ type: ChannelType; name: string; config: Record<string, any> }>({
    type: 'email',
    name: '',
    config: {},
  });
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    event: 'incident_created',
    severity: '',
    cooldownMinutes: 0,
    alertChannelIds: [] as string[],
  });

  useEffect(() => {
    if (!currentWorkspace) fetchWorkspaces();
  }, [currentWorkspace, fetchWorkspaces]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const wsId = currentWorkspace?.id;

  const channelsQ = useQuery<AlertChannel[]>({
    queryKey: ['alertChannels', wsId],
    queryFn: async () => (await api.get(`/workspaces/${wsId}/alerts/channels`)).data,
    enabled: !!wsId,
  });

  const policiesQ = useQuery<AlertPolicy[]>({
    queryKey: ['alertPolicies', wsId],
    queryFn: async () => (await api.get(`/workspaces/${wsId}/alerts/policies`)).data,
    enabled: !!wsId,
  });

  const onErr = (e: any) =>
    setToast({ kind: 'error', text: e?.response?.data?.message || e?.message || 'Operation failed' });

  const createChannel = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${wsId}/alerts/channels`, newChannel)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertChannels'] });
      setIsChannelModalOpen(false);
      setNewChannel({ type: 'email', name: '', config: {} });
      setToast({ kind: 'success', text: 'Channel created' });
    },
    onError: onErr,
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/workspaces/${wsId}/alerts/channels/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertChannels'] });
      setToast({ kind: 'success', text: 'Channel removed' });
    },
    onError: onErr,
  });

  const testChannel = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/workspaces/${wsId}/alerts/test`, {
        channelId: id,
        title: 'PulseBoard test alert',
        message: 'If you can read this, your channel works.',
      })).data,
    onSuccess: () => setToast({ kind: 'success', text: 'Test alert dispatched' }),
    onError: onErr,
  });

  const createPolicy = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${wsId}/alerts/policies`, {
        ...newPolicy,
        severity: newPolicy.severity || undefined,
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertPolicies'] });
      setIsPolicyModalOpen(false);
      setNewPolicy({ name: '', event: 'incident_created', severity: '', cooldownMinutes: 0, alertChannelIds: [] });
      setToast({ kind: 'success', text: 'Policy created' });
    },
    onError: onErr,
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/workspaces/${wsId}/alerts/policies/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertPolicies'] });
      setToast({ kind: 'success', text: 'Policy removed' });
    },
    onError: onErr,
  });

  const togglePolicy = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
      (await api.put(`/workspaces/${wsId}/alerts/policies/${id}`, { enabled })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertPolicies'] }),
    onError: onErr,
  });

  const applyTemplate = (tpl: typeof POLICY_TEMPLATES[number]) => {
    setNewPolicy({
      name: tpl.name,
      event: tpl.event,
      severity: tpl.severity,
      cooldownMinutes: tpl.cooldownMinutes,
      alertChannelIds: channelsQ.data?.map(c => c.id).slice(0, 1) ?? [],
    });
    setIsPolicyModalOpen(true);
  };

  const channelTemplate = CHANNEL_TEMPLATES[newChannel.type];

  const getChannelIcon = (type: string) => {
    const tpl = (CHANNEL_TEMPLATES as any)[type];
    const Icon = tpl?.icon ?? Bell;
    return <Icon className="h-5 w-5" />;
  };

  if (!currentWorkspace) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.kind === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-gray-500">Configure where alerts go and when they fire</p>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Alert channels</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Where alerts get sent: Slack, email, webhooks, Discord</p>
          </div>
          <Button size="sm" onClick={() => setIsChannelModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add channel
          </Button>
        </CardHeader>
        <CardContent>
          {channelsQ.isLoading ? (
            <LoadingSpinner />
          ) : !channelsQ.data || channelsQ.data.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
              <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-1">No channels configured yet</p>
              <p className="text-xs text-gray-400 mb-4">Pick a destination to receive your alerts</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(Object.keys(CHANNEL_TEMPLATES) as ChannelType[]).map((t) => {
                  const tpl = CHANNEL_TEMPLATES[t];
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setNewChannel({ type: t, name: '', config: {} });
                        setIsChannelModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-sm"
                    >
                      <Icon className="h-4 w-4" /> {tpl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {channelsQ.data.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {getChannelIcon(c.type)}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{c.type}</p>
                      </div>
                    </div>
                    <Badge variant={c.enabled ? 'success' : 'default'}>
                      {c.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testChannel.mutate(c.id)}
                      disabled={testChannel.isPending}
                    >
                      <Send className="h-4 w-4" /> Send test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${c.name}?`)) deleteChannel.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Alert policies</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Rules that decide when alerts fire and to which channels</p>
          </div>
          <Button size="sm" onClick={() => setIsPolicyModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add policy
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates */}
          {(!policiesQ.data || policiesQ.data.length === 0) && (
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary-500" /> Templates to start with
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {POLICY_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    disabled={!channelsQ.data || channelsQ.data.length === 0}
                    className="text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <Badge variant="info">{tpl.event.replace(/_/g, ' ')}</Badge>
                      {tpl.severity && <Badge variant="warning">{tpl.severity}</Badge>}
                      {tpl.cooldownMinutes ? (
                        <Badge>{tpl.cooldownMinutes}m cooldown</Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
              {(!channelsQ.data || channelsQ.data.length === 0) && (
                <p className="text-xs text-gray-500 mt-3">
                  Add at least one channel above before creating a policy.
                </p>
              )}
            </div>
          )}

          {policiesQ.isLoading ? (
            <LoadingSpinner />
          ) : !policiesQ.data || policiesQ.data.length === 0 ? null : (
            <div className="space-y-3">
              {policiesQ.data.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <Bell className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-500">
                        On {p.event.replace(/_/g, ' ')}
                        {p.severity && ` for ${p.severity} severity`}
                        {p.cooldownMinutes ? ` · ${p.cooldownMinutes}m cooldown` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => togglePolicy.mutate({ id: p.id, enabled: !p.enabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        p.enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          p.enabled ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${p.name}?`)) deletePolicy.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Channel Modal */}
      <Modal isOpen={isChannelModalOpen} onClose={() => setIsChannelModalOpen(false)} size="lg">
        <ModalHeader onClose={() => setIsChannelModalOpen(false)}>Add alert channel</ModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createChannel.mutate();
          }}
        >
          <ModalBody className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-2">Channel type</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(CHANNEL_TEMPLATES) as ChannelType[]).map((t) => {
                  const tpl = CHANNEL_TEMPLATES[t];
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewChannel({ type: t, name: newChannel.name, config: {} })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        newChannel.type === t
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{tpl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Channel name"
              placeholder="Engineering team"
              value={newChannel.name}
              onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
              required
            />

            {channelTemplate.fields.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                hint={f.hint}
                value={(newChannel.config[f.key] as string) ?? ''}
                onChange={(e) =>
                  setNewChannel({
                    ...newChannel,
                    config: { ...newChannel.config, [f.key]: e.target.value },
                  })
                }
              />
            ))}

            <button
              type="button"
              onClick={() => setShowSetupFor(showSetupFor === newChannel.type ? null : newChannel.type)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              {showSetupFor === newChannel.type ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              How to set up {channelTemplate.label}
            </button>
            {showSetupFor === newChannel.type && (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm space-y-2">
                <p className="font-medium">{channelTemplate.setup.title}</p>
                <ol className="space-y-1 list-decimal list-inside text-gray-600 dark:text-gray-400">
                  {channelTemplate.setup.steps.map((s, i) => (
                    <li key={i}>
                      {s.text}
                      {s.href && (
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline ml-1"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsChannelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createChannel.isPending}>
              Create channel
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Create Policy Modal */}
      <Modal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)}>
        <ModalHeader onClose={() => setIsPolicyModalOpen(false)}>Add alert policy</ModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPolicy.mutate();
          }}
        >
          <ModalBody className="space-y-4">
            <Input
              label="Policy name"
              placeholder="e.g. Critical incidents"
              value={newPolicy.name}
              onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
              required
            />
            <div>
              <label className="text-sm font-medium block mb-1">Event</label>
              <select
                value={newPolicy.event}
                onChange={(e) => setNewPolicy({ ...newPolicy, event: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="incident_created">Incident created</option>
                <option value="incident_resolved">Incident resolved</option>
                <option value="incident_updated">Incident updated</option>
                <option value="monitor_down">Monitor went down</option>
                <option value="monitor_recovered">Monitor recovered</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Minimum severity (optional)</label>
              <select
                value={newPolicy.severity}
                onChange={(e) => setNewPolicy({ ...newPolicy, severity: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="">Any severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <Input
              label="Cooldown (minutes)"
              type="number"
              min={0}
              value={newPolicy.cooldownMinutes}
              onChange={(e) => setNewPolicy({ ...newPolicy, cooldownMinutes: Number(e.target.value) })}
              hint="Wait this long between alerts to avoid spam. 0 = no cooldown."
            />
            <div>
              <label className="text-sm font-medium block mb-1">Send to channels</label>
              {channelsQ.data && channelsQ.data.length > 0 ? (
                <div className="space-y-2">
                  {channelsQ.data.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={newPolicy.alertChannelIds.includes(c.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...newPolicy.alertChannelIds, c.id]
                            : newPolicy.alertChannelIds.filter(id => id !== c.id);
                          setNewPolicy({ ...newPolicy, alertChannelIds: next });
                        }}
                      />
                      <span className="text-sm flex-1">{c.name}</span>
                      <Badge>{c.type}</Badge>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No channels yet. Add one before creating a policy.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsPolicyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createPolicy.isPending}
              disabled={!newPolicy.alertChannelIds.length || !newPolicy.name}
            >
              Create policy
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
