import { apiClient } from './api';
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from '@/types/workspace';

export const workspaceApi = {
  getAll: async (): Promise<Workspace[]> => {
    return apiClient.get<Workspace[]>('/workspaces');
  },

  getById: async (id: string): Promise<Workspace> => {
    return apiClient.get<Workspace>(`/workspaces/${id}`);
  },

  create: async (data: CreateWorkspaceInput, options?: RequestInit): Promise<Workspace> => {
    return apiClient.post<Workspace>('/workspaces', data, options);
  },

  update: async (id: string, data: UpdateWorkspaceInput): Promise<Workspace> => {
    return apiClient.put<Workspace>(`/workspaces/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/workspaces/${id}`);
  },
};

