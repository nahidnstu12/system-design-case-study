import { z } from 'zod';
import { sanitizeString, sanitizeContent } from '../utils/sanitize';

export const createWorkspaceSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title cannot exceed 100 characters')
      .transform((val) => sanitizeString(val)),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .transform((val) => (val ? sanitizeContent(val) : val)),
  }),
});

export const updateWorkspaceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .transform((val) => (val ? sanitizeString(val) : val)),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((val) => (val ? sanitizeContent(val) : val)),
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

