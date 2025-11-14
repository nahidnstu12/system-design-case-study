export enum PageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface Page {
  _id: string;
  title: string;
  content?: string;
  workspaceId: string;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  title: string;
  content?: string;
}

export interface UpdatePageInput {
  title?: string;
  content?: string;
}

