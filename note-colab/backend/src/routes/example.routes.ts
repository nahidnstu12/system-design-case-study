import { Router } from 'express';
import {
  getExamples,
  getExampleById,
  createExample,
  updateExample,
  deleteExample,
} from '../controllers/example.controller';
import { validate } from '../middleware/validate';
import {
  createExampleSchema,
  updateExampleSchema,
  getExampleByIdSchema,
  deleteExampleSchema,
} from '../schemas/example.schema';

const router = Router();

router.get('/', getExamples);
router.get('/:id', validate(getExampleByIdSchema), getExampleById);
router.post('/', validate(createExampleSchema), createExample);
router.put('/:id', validate(updateExampleSchema), updateExample);
router.delete('/:id', validate(deleteExampleSchema), deleteExample);

export { router as exampleRoutes };

