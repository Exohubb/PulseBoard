import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  AlertTriangle,
  Clock,
  User,
  CheckCircle,
  MessageSquare,
  ArrowLeft,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useWorkspaceStore();
  const qc = useQueryClient();

  const [updateOpen, setUpdateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateForm, setUpdateForm] = useState({ type: 'note_added', message: '', internalOnly: false });
  const [resolveSummary, setResolveSummary] = useState('');
  const [newStatus, setNewStatus] = useState('investigating');
  const [newSeverity, setNewSeverity] = useState('medium');

  const incidentQ = useQuery({
    queryKey: ['incident', currentWorkspace?.id, id],
    queryFn: async () => (await api.get(`/workspaces/${currentWorkspace!.id}/incidents/${id}`)).data,
    enabled: !!currentWorkspace?.id && !!id,
  });

  const timelineQ = useQuery({
    queryKey: ['incident-timeline', currentWorkspace?.id, id],
    queryFn: async () => (await api.get(`/workspaces/${currentWorkspace!.id}/incidents/${id}/timeline`)).data,
    enabled: !!currentWorkspace?.id && !!id,
    refetchInterval: 15000,
  });

  const onErr = (e: any) => setError(e?.response?.data?.message || 'Operation failed');
  const onOk = () => {
    qc.invalidateQueries({ queryKey: ['incident'] });
    qc.invalidateQueries({ queryKey: ['incident-timeline'] });
    setError(null);
  };

  const addUpdate = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${currentWorkspace!.id}/incidents/${id}/updates`, updateForm)).data,
    onSuccess: () => {
      onOk();
      setUpdateOpen(false);
      setUpdateForm({ type: 'note_added', message: '', internalOnly: false });
    },
    onError: onErr,
  });

  const resolve = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${currentWorkspace!.id}/incidents/${id}/resolve`, {
        publicSummary: resolveSummary || undefined,
      })).data,
    onSuccess: () => {
      onOk();
      setResolveOpen(false);
      setResolveSummary('');
    },
    onError: onErr,
  });

  const close = useMutation({
    mutationFn: async () =>
      (await api.post(`/workspaces/${currentWorkspace!.id}/incidents/${id}/close`)).data,
    onSuccess: onOk,
    onError: onErr,
  });

  const updateStatus = useMutation({
    mutationFn: async () =>
      (await api.put(`/workspaces/${currentWorkspace!.id}/incidents/${id}`, { status: newStatus })).data,
    onSuccess: () => {
      onOk();
      setStatusOpen(false);
    },
    onError: onErr,
  });

  const updateSeverity = useMutation({
    mutationFn: async () =>
      (await api.put(`/workspaces/${currentWorkspace!.id}/incidents/${id}`, { severity: newSeverity })).data,
    onSuccess: () => {
      onOk();
      setSeverityOpen(false);
    },
    onError: onErr,
  });

  if (incidentQ.isLoading) return <LoadingSpinner />;
  if (incidentQ.error || !incidentQ.data) {
    return (
      <div className="space-y-4">
        <Link to="/app/incidents" className="text-sm text-primary-600 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> All incidents
        </Link>
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
          Incident not found.
        </div>
      </div>
    );
  }

  const incident = incidentQ.data;
  const updates = timelineQ.data ?? incident.updates ?? [];
  const isClosed = incident.status === 'closed';
  const isResolved = incident.status === 'resolved' || incident.status === 'closed';

  return (
    <div className="space-y-6">
      <Link to="/app/incidents" className="text-sm text-gray-500 hover:text-primary-600 inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> All incidents
      </Link>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto">×</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isResolved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {isResolved ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words">{incident.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              {incident.source && <Badge>{incident.source}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isResolved && (
            <>
              <Button variant="outline" onClick={() => setUpdateOpen(true)}>Add Update</Button>
              <Button onClick={() => setResolveOpen(true)} isLoading={resolve.isPending}>Resolve</Button>
            </>
          )}
          {isResolved && !isClosed && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Close this incident? Closed incidents are read-only.')) close.mutate();
              }}
              isLoading={close.isPending}
            >
              Close Incident
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No updates yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
                <div className="space-y-6">
                  {updates.map((u: any) => (
                    <div key={u.id} className="relative pl-10">
                      <div
                        className={`absolute left-[-9px] top-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          u.type === 'created' || u.type === 'incident_created'
                            ? 'bg-primary-600'
                            : u.type === 'resolved' || u.type === 'incident_resolved'
                            ? 'bg-green-500'
                            : u.type === 'closed' || u.type === 'incident_closed'
                            ? 'bg-gray-500'
                            : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        {(u.type === 'created' || u.type === 'incident_created') && (
                          <AlertTriangle className="h-3 w-3 text-white" />
                        )}
                        {(u.type === 'resolved' || u.type === 'incident_resolved') && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                        {u.type === 'note_added' && <MessageSquare className="h-3 w-3 text-white" />}
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {String(u.type).replace(/_/g, ' ')}
                            </span>
                            {u.internalOnly && (
                              <Badge variant="warning" className="gap-1">
                                <Lock className="h-3 w-3" /> Internal
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(new Date(u.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{u.message}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {u.user?.name ?? u.userName ?? 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Created</p>
                <p>{new Date(incident.createdAt ?? incident.startedAt).toLocaleString()}</p>
              </div>
              {incident.resolvedAt && (
                <div>
                  <p className="text-gray-500">Resolved</p>
                  <p>{new Date(incident.resolvedAt).toLocaleString()}</p>
                </div>
              )}
              {incident.impactSummary && (
                <div>
                  <p className="text-gray-500">Impact</p>
                  <p className="whitespace-pre-wrap">{incident.impactSummary}</p>
                </div>
              )}
              {incident.publicSummary && (
                <div>
                  <p className="text-gray-500">Public summary</p>
                  <p className="whitespace-pre-wrap">{incident.publicSummary}</p>
                </div>
              )}
              {incident.serviceLinks && incident.serviceLinks.length > 0 && (
                <div>
                  <p className="text-gray-500">Affected services</p>
                  <ul className="mt-1 space-y-1">
                    {incident.serviceLinks.map((link: any) => (
                      <li key={link.id}>{link.service?.name ?? link.monitor?.name ?? '—'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {!isClosed && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewStatus(incident.status);
                    setStatusOpen(true);
                  }}
                >
                  Change Status
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewSeverity(incident.severity);
                    setSeverityOpen(true);
                  }}
                >
                  Change Severity
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setUpdateOpen(true)}
                >
                  Add Update / Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={updateOpen} onClose={() => setUpdateOpen(false)}>
        <ModalHeader onClose={() => setUpdateOpen(false)}>Add update</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <select
                value={updateForm.type}
                onChange={(e) => setUpdateForm({ ...updateForm, type: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="note_added">Note</option>
                <option value="status_changed">Status update</option>
                <option value="action_taken">Action taken</option>
                <option value="root_cause">Root cause</option>
              </select>
            </div>
            <Textarea
              label="Message"
              placeholder="What happened or what was done?"
              value={updateForm.message}
              onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })}
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={updateForm.internalOnly}
                onChange={(e) => setUpdateForm({ ...updateForm, internalOnly: e.target.checked })}
              />
              Internal only (don't show on public status page)
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
          <Button
            onClick={() => addUpdate.mutate()}
            disabled={!updateForm.message}
            isLoading={addUpdate.isPending}
          >
            Post Update
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}>
        <ModalHeader onClose={() => setResolveOpen(false)}>Resolve incident</ModalHeader>
        <ModalBody>
          <Textarea
            label="Public summary (optional)"
            placeholder="What was the issue and how was it resolved? Visible on the public status page."
            value={resolveSummary}
            onChange={(e) => setResolveSummary(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
          <Button onClick={() => resolve.mutate()} isLoading={resolve.isPending}>
            Mark Resolved
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={statusOpen} onClose={() => setStatusOpen(false)}>
        <ModalHeader onClose={() => setStatusOpen(false)}>Change status</ModalHeader>
        <ModalBody>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button onClick={() => updateStatus.mutate()} isLoading={updateStatus.isPending}>Update</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={severityOpen} onClose={() => setSeverityOpen(false)}>
        <ModalHeader onClose={() => setSeverityOpen(false)}>Change severity</ModalHeader>
        <ModalBody>
          <select
            value={newSeverity}
            onChange={(e) => setNewSeverity(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setSeverityOpen(false)}>Cancel</Button>
          <Button onClick={() => updateSeverity.mutate()} isLoading={updateSeverity.isPending}>Update</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
