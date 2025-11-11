import { Router } from 'express';
import {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../controllers/workspace';
import { validate } from '../middleware/validate';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  getWorkspaceByIdSchema,
  deleteWorkspaceSchema,
} from '../schemas/workspace';
import {
  createPageSchema,
  deletePageSchema,
  getPageByIdSchema,
  updatePageSchema,
} from '@/schemas/pages';
import { createPage, deletePage, getPageById, getPages, updatePage } from '@/controllers/page';

const router = Router();

router.get('/', getWorkspaces);
router.get('/:id', validate(getWorkspaceByIdSchema), getWorkspaceById);
router.post('/', validate(createWorkspaceSchema), createWorkspace);
router.put('/:id', validate(updateWorkspaceSchema), updateWorkspace);
router.delete('/:id', validate(deleteWorkspaceSchema), deleteWorkspace);

router.get('/:id/pages', getPages);
router.get('/:id/pages/:pageId', validate(getPageByIdSchema), getPageById);
router.post('/:id/pages', validate(createPageSchema), createPage);
router.put('/:id/pages/:pageId', validate(updatePageSchema), updatePage);
router.delete('/:id/pages/:pageId', validate(deletePageSchema), deletePage);

export { router as workspaceRoutes };
