import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    });
  })
);

export { router as healthRoutes };

