import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../utils/asyncHandler';
import { CommonStatus, Page } from '@/models/pages';

export const getPages = asyncHandler(async (_req: Request, res: Response) => {
  const pages = await Page.find({ status: CommonStatus.ACTIVE }).populate('workspaceId').sort({ createdAt: -1 });
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
  const page = await Page.create({ ...req.body, workspaceId: req.params.id });
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: page,
  });
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

