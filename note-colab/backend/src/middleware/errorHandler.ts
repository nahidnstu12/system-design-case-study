import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: Record<string, string> | undefined;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Validation Error';
    errors = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      errors![path] = error.message;
    });
  }
  // Mongoose validation errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Validation Error';
    errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors![key] = err.errors[key].message;
    });
  }
  // Mongoose cast errors (invalid ObjectId, etc.)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // Custom application errors
  else if (err instanceof CustomError || (err as AppError).isOperational) {
    statusCode = (err as AppError).statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    message = err.message;
  }
  // Default to 500 server errors
  else {
    message = err.message || 'Internal Server Error';
  }

  const response: {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
    stack?: string;
  } = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

