import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  impactSummary?: string;
  serviceIds?: string[];
  createdAt: string;
  resolvedAt?: string;
}

interface Service {
  id: string;
  name: string;
}

export function IncidentsPage() {
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    severity: 'medium',
    serviceIds: [] as string[],
    impactSummary: '',
  });

  // Fetch workspaces if not loaded
  useState(() => {
    if (!currentWorkspace) {
      fetchWorkspaces();
    }
  });

  // Fetch incidents
  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/incidents`);
      return response.data;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch services for dropdown
  const { data: services } = useQuery<Service[]>({
    queryKey: ['services', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/services`);
      return response.data;
    },
    enabled: !!currentWorkspace,
  });

  // Create incident mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; severity: string; serviceIds?: string[]; impactSummary?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/incidents`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', currentWorkspace?.slug] });
      setIsCreateModalOpen(false);
      setNewIncident({ title: '', severity: 'medium', serviceIds: [], impactSummary: '' });
    },
  });

  // Resolve incident mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/incidents/${id}/resolve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', currentWorkspace?.slug] });
    },
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newIncident);
  };

  const handleResolve = (id: string) => {
    resolveMutation.mutate(id);
  };

  const getServiceName = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    return service?.name || serviceId;
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeIncidents = incidents?.filter(i =>
    ['open', 'investigating', 'identified', 'monitoring'].includes(i.status)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-gray-500">Track and manage incidents</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Incident
        </Button>
      </div>

      {/* Active incidents alert */}
      {activeIncidents.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {activeIncidents.length} active incident(s)
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !incidents || incidents.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="No incidents"
              description="All systems operational"
            />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {incidents.map((incident) => (
                <Link
                  to={`/app/incidents/${incident.id}`}
                  key={incident.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      <p className="text-sm text-gray-500">
                        {incident.serviceIds?.map(id => getServiceName(id)).filter(Boolean).join(', ') || 'No service'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {formatRelativeTime(new Date(incident.createdAt))}
                    </div>
                    {incident.status !== 'resolved' && incident.status !== 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleResolve(incident.id);
                        }}
                        disabled={resolveMutation.isPending}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Incident Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalHeader>Create Incident</ModalHeader>
        <form onSubmit={handleCreateIncident}>
          <ModalBody className="space-y-4">
            <Input
              label="Title"
              placeholder="Brief description of the incident"
              value={newIncident.title}
              onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Severity
              </label>
              <select
                value={newIncident.severity}
                onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Services
              </label>
              <select
                multiple
                value={newIncident.serviceIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setNewIncident({ ...newIncident, serviceIds: selected });
                }}
                className="w-full h-24 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                {services?.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
            <Input
              label="Impact Summary"
              placeholder="Describe the impact of this incident"
              value={newIncident.impactSummary}
              onChange={(e) => setNewIncident({ ...newIncident, impactSummary: e.target.value })}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Incident
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}