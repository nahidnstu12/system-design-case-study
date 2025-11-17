import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler';
import { retryMongoOperation } from '../utils/retryMongoOperation';
import { CommonStatus, Page } from '@/models/pages';

export const getPages = asyncHandler(async (req: Request, res: Response) => {
  const { id: workspaceId } = req.params;
  const pages = await Page.find({ workspaceId, status: CommonStatus.ACTIVE })
    .populate('workspaceId')
    .sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json({
    success: true,
    data: pages,
  });
});

export const getPageById = asyncHandler(async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const page = await Page.findById(pageId).populate('workspaceId');

  if (!page) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Page not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: page,
  });
});

export const createPage = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = await retryMongoOperation(
      () => Page.create({ ...req.body, workspaceId: req.params.id }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
      }
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: page,
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

export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const page = await Page.findByIdAndUpdate(pageId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!page) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Page not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: page,
  });
});

export const deletePage = asyncHandler(async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const page = await Page.findByIdAndDelete(pageId);

  if (!page) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Page not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Page deleted successfully',
  });
});
