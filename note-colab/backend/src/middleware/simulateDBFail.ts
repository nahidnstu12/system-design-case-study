import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to simulate random DB failures
 */
let failureCount = 0;

export const simulateDBFailure = (req: Request, res: Response, next: NextFunction): any => {
  // Only for page creation
  if (req.method === 'POST') {
    failureCount++;
    console.log("failureCount>>",failureCount);

    // Fail first 2 attempts, succeed on 3rd
    if (failureCount <= 2) {
      console.log("Simulating DB failure");
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Database connection lost. Please retry.',
        retryAfter: 2,
      });
    }

    // Reset counter after success
    failureCount = 0;
  }

  console.log("Simulating DB success");
  next();
};
