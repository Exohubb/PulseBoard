import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../lib/workspace-store';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus, Globe, ExternalLink, Copy, Trash2, Loader2 } from 'lucide-react';

interface StatusPage {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  accentColor?: string;
  introText?: string;
  components?: { id: string; name: string }[];
}

export function StatusPagesPage() {
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPage, setNewPage] = useState({
    name: '',
    slug: '',
    accentColor: '#6366f1',
    introText: '',
  });

  // Fetch workspaces if not loaded
  useState(() => {
    if (!currentWorkspace) {
      fetchWorkspaces();
    }
  });

  // Fetch status pages
  const { data: statusPages, isLoading } = useQuery<StatusPage[]>({
    queryKey: ['statusPages', currentWorkspace?.slug],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.get(`/workspaces/${currentWorkspace.slug}/status-pages`);
      return response.data;
    },
    enabled: !!currentWorkspace,
  });

  // Create status page mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; accentColor?: string; introText?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/status-pages`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusPages', currentWorkspace?.slug] });
      setIsCreateModalOpen(false);
      setNewPage({ name: '', slug: '', accentColor: '#6366f1', introText: '' });
    },
  });

  // Delete status page mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await api.delete(`/workspaces/${currentWorkspace.slug}/status-pages/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusPages', currentWorkspace?.slug] });
    },
  });

  // Publish/unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const endpoint = published ? 'publish' : 'unpublish';
      const response = await api.post(`/workspaces/${currentWorkspace.slug}/status-pages/${id}/${endpoint}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusPages', currentWorkspace?.slug] });
    },
  });

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newPage);
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/status/${slug}`);
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
          <h1 className="text-2xl font-bold">Status Pages</h1>
          <p className="text-gray-500">Public status pages for your users</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Status Page
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !statusPages || statusPages.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title="No status pages yet"
          description="Create a public status page to show your users the health of your services"
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Status Page
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusPages.map((page) => (
            <Card key={page.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (page.accentColor || '#6366f1') + '20' }}
                    >
                      <Globe className="h-5 w-5" style={{ color: page.accentColor || '#6366f1' }} />
                    </div>
                    <div>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-sm text-gray-500">/{page.slug}</p>
                    </div>
                  </div>
                  <Badge variant={page.published ? 'success' : 'default'}>
                    {page.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{page.components?.length || 0} components</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`/status/${page.slug}`, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopyLink(page.slug)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublishMutation.mutate({ id: page.id, published: !page.published })}
                    disabled={togglePublishMutation.isPending}
                  >
                    {page.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(page.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">PulseBoard Status</p>
                  <p className="text-sm text-gray-500">Last updated: just now</p>
                </div>
              </div>
              <StatusBadge status="operational" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium">All Systems Operational</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-2xl font-bold text-green-600">99.9%</p>
                  <p className="text-gray-500">Uptime 90d</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-gray-500">Active Incidents</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-gray-500">Maintenance</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Status Page Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalHeader>Create Status Page</ModalHeader>
        <form onSubmit={handleCreatePage}>
          <ModalBody className="space-y-4">
            <Input
              label="Page Name"
              placeholder="Company Status"
              value={newPage.name}
              onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
              required
            />
            <Input
              label="Slug"
              placeholder="company-status"
              value={newPage.slug}
              onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              hint="This will be used in the URL: /status/{slug}"
              required
            />
            <Input
              label="Accent Color"
              type="color"
              value={newPage.accentColor}
              onChange={(e) => setNewPage({ ...newPage, accentColor: e.target.value })}
            />
            <Input
              label="Introduction Text"
              placeholder="We are committed to keeping our services available..."
              value={newPage.introText}
              onChange={(e) => setNewPage({ ...newPage, introText: e.target.value })}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Status Page
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}