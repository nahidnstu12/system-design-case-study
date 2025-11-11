import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Example } from '../models/example.model';
import { asyncHandler } from '../utils/asyncHandler';

export const getExamples = asyncHandler(async (_req: Request, res: Response) => {
  const examples = await Example.find().sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json({
    success: true,
    data: examples,
  });
});

export const getExampleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const example = await Example.findById(id);

  if (!example) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Example not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: example,
  });
});

export const createExample = asyncHandler(async (req: Request, res: Response) => {
  const example = await Example.create(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: example,
  });
});

export const updateExample = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const example = await Example.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!example) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Example not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: example,
  });
});

export const deleteExample = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const example = await Example.findByIdAndDelete(id);

  if (!example) {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'Example not found',
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Example deleted successfully',
  });
});

