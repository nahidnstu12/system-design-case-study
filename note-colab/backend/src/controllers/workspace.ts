import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Workspace } from '../models/wrokspace';
import { asyncHandler } from '../utils/asyncHandler';

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

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await Workspace.create(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: workspace,
  });
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

