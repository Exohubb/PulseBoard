import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Plus, Server, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  slug: string;
  status: string;
  environment: string;
  description?: string;
  monitors: { id: string; name: string; lastStatus: string }[];
}

export function ServicesPage() {
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', description: '', environment: 'production' });

  // Fetch workspaces if not loaded
  useState(() => {
    if (!currentWorkspace) {
      fetchWorkspaces();
    }
  });

  // Fetch services
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['services', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/services`);
      return response.data;
    },
    enabled: !!currentWorkspace,
  });

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; environment?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/services`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', currentWorkspace?.slug] });
      setIsCreateModalOpen(false);
      setNewService({ name: '', description: '', environment: 'production' });
    },
  });

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newService);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-gray-500">Monitor the health of your services</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !services || services.length === 0 ? (
        <EmptyState
          icon={<Server className="h-8 w-8" />}
          title="No services yet"
          description="Create your first service to start monitoring"
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const failingMonitors = service.monitors?.filter(m => m.lastStatus === 'down').length || 0;
            return (
              <Link key={service.id} to={`/app/services/${service.id}`}>
                <Card className="hover:border-primary-300 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Server className="h-5 w-5 text-primary-600" />
                      </div>
                      <StatusBadge status={service.status || 'unknown'} />
                    </div>

                    <h3 className="font-semibold mb-1">{service.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{service.description || service.slug}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {service.monitors?.length || 0} monitor{(service.monitors?.length || 0) !== 1 ? 's' : ''}
                        {failingMonitors > 0 && <span className="text-red-500 ml-1">({failingMonitors} failing)</span>}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {service.environment}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Service Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalHeader>Add Service</ModalHeader>
        <form onSubmit={handleCreateService}>
          <ModalBody className="space-y-4">
            <Input
              label="Service Name"
              placeholder="API Backend"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              required
            />
            <Input
              label="Description"
              placeholder="Main API service"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Environment
              </label>
              <select
                value={newService.environment}
                onChange={(e) => setNewService({ ...newService, environment: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Service
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
