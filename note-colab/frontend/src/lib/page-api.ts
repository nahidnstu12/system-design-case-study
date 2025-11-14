import { apiClient } from './api';
import type { Page, CreatePageInput, UpdatePageInput } from '@/types/page';

export const pageApi = {
  getAll: async (workspaceId: string): Promise<Page[]> => {
    return apiClient.get<Page[]>(`/workspaces/${workspaceId}/pages`);
  },

  getById: async (workspaceId: string, pageId: string): Promise<Page> => {
    return apiClient.get<Page>(`/workspaces/${workspaceId}/pages/${pageId}`);
  },

  create: async (workspaceId: string, data: CreatePageInput): Promise<Page> => {
    return apiClient.post<Page>(`/workspaces/${workspaceId}/pages`, data);
  },

  update: async (workspaceId: string, pageId: string, data: UpdatePageInput): Promise<Page> => {
    return apiClient.put<Page>(`/workspaces/${workspaceId}/pages/${pageId}`, data);
  },

  delete: async (workspaceId: string, pageId: string): Promise<void> => {
    return apiClient.delete<void>(`/workspaces/${workspaceId}/pages/${pageId}`);
  },
};

