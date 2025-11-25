import { z } from 'zod';
import { sanitizeString, sanitizeContent } from '../utils/sanitize';

export const createPageSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title cannot exceed 100 characters')
      .transform((val) => sanitizeString(val)),
    content: z
      .string()
      .max(500, 'Content cannot exceed 500 characters')
      .optional()
      .transform((val) => (val ? sanitizeContent(val) : val)),
    __v: z.number().optional(),
  }),
});

export const updatePageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format'),
    pageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid page ID format'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .transform((val) => (val ? sanitizeString(val) : val)),
    content: z
      .string()
      .max(5000)
      .optional()
      .transform((val) => (val ? sanitizeContent(val) : val)),
    __v: z.number().optional(),
  }),
});

export const getPageByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format'),
    pageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid page ID format'),
  }),
});

export const deletePageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format'),
    pageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid page ID format'),
  }),
});
