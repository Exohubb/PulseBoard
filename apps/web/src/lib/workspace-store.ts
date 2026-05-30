import { create } from 'zustand';
import { api } from './api';

interface Workspace {
  id: string;
  slug: string;
  name: string;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,

  setCurrentWorkspace: (workspace: Workspace) => {
    set({ currentWorkspace: workspace });
    localStorage.setItem('pulseboard-workspace', JSON.stringify(workspace));
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/users/me/workspaces');
      const workspaces = response.data.map((membership: any) => ({
        id: membership.workspace.id,
        slug: membership.workspace.slug,
        name: membership.workspace.name,
      }));

      set({ workspaces });

      // Load saved workspace or use first one
      const saved = localStorage.getItem('pulseboard-workspace');
      const savedWorkspace = saved ? JSON.parse(saved) : null;
      const currentWorkspace = savedWorkspace && workspaces.find((w: Workspace) => w.id === savedWorkspace.id)
        ? savedWorkspace
        : workspaces[0];

      if (currentWorkspace) {
        set({ currentWorkspace });
        localStorage.setItem('pulseboard-workspace', JSON.stringify(currentWorkspace));
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
