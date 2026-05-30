import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

interface RealtimeState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (workspaceId: string) => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (workspaceId: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      existingSocket.emit('join', { workspaceId });
      return;
    }

    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('join', { workspaceId });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', () => {
      set({ isConnected: false });
    });

    set({ socket, isConnected: false });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  emit: (event: string, data: any) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit(event, data);
    }
  },
}));