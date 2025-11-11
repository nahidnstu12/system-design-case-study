import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  }),
});

export const updateWorkspaceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  }),
});

export const getWorkspaceByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
});

export const deleteWorkspaceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
});

