import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Workspace } from '../models/wrokspace';
import { asyncHandler } from '../utils/asyncHandler';
import { retryMongoOperation } from '@/utils/retryMongoOperation';

export const getWorkspaces = asyncHandler(async (_req: Request, res: Response) => {
  const workspaces = await Workspace.find().sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json({
    success: true,
    data: workspaces,
  });
});

export const getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const workspace = await Workspace.findById(id);

  if (!workspace) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Workspace not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: workspace,
  });
});

export const createWorkspace2 = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await Workspace.create(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: workspace,
  });
});

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  try {
    const workspace = await retryMongoOperation(
      () => Workspace.create(req.body),
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
      }
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    // MongoDB connection errors after retries
    if (
      error?.name === 'MongoNetworkError' ||
      error?.name === 'MongoServerError' ||
      error?.name === 'MongoTimeoutError'
    ) {
      console.log("MongoDB connection errors after retries>>",error);
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Database connection lost. Please retry.',
        retryAfter: 5, // seconds
      });
    }

    // Other errors (validation, etc.)
    console.log("Other errors (validation, etc.)>>",error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const workspace = await Workspace.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!workspace) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Workspace not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: workspace,
  });
});

export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const workspace = await Workspace.findByIdAndDelete(id);

  if (!workspace) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Workspace not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Workspace deleted successfully',
  });
});

