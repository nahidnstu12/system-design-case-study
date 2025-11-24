import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";

const requestCache = new Map();

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Express normalizes headers to lowercase, but check both cases for safety
  const key = (req.headers['x-request-id'] || req.headers['X-Request-ID']) as string;

//   console.log("idempotencyMiddleware>>", {
//     key,
//     headers: req.headers,
//     cacheSize: requestCache.size,
//   });
  
  if (!key) {
    console.log("No X-Request-ID header found, skipping idempotency check");
    return next();
  }
  
  if (requestCache.has(key)) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Request processed successfully',
      data: requestCache.get(key),
    });
  }
  
  // Override res.json to cache response
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    requestCache.set(key, data);
    return originalJson(data);
  };
  
  next();
};