import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: any; query?: any; params?: any };
      
      // Update req with sanitized values from Zod transform
      if (result.body) req.body = result.body;
      if (result.query) req.query = { ...req.query, ...result.query };
      if (result.params) req.params = { ...req.params, ...result.params };
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        console.log("Validation Error>>",errors);

        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation Error',
          errors,
        });
        return;
      }
      next(error);
    }
  };

