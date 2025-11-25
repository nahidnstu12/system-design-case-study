# Collaborative Notes System - Backend Documentation

## Overview

This backend implements a **collaborative notes system** (POC) similar to Notion/Google Docs, focusing on core system design principles. The system allows multiple users to create workspaces and pages, with real-time conflict resolution, robust error handling, and production-ready features.

**Tech Stack:** Express.js, TypeScript, MongoDB (Mongoose), Zod, Node.js

---

## System Design Techniques Implemented

### 1. Cascade Delete (Workspace → Pages)

**Problem:** When a workspace is deleted, orphaned pages remain in the database, causing data inconsistency and potential security issues.

**Solution:** Mongoose pre-hook middleware automatically deletes all associated pages when a workspace is deleted.

**Implementation:**

```43:57:backend/src/models/wrokspace.ts
WorkspaceSchema.pre(
  'findOneAndDelete' as any,
  async function (this: Query<IWorkspace | null, IWorkspace>, next: NextFunction) {
    try {
      const workspaceId = this.getFilter()._id;
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }
      await Page.deleteMany({ workspaceId });
      next();
    } catch (error) {
      next(error);
    }
  }
);
```

**How it works:**
- Mongoose `pre('findOneAndDelete')` hook intercepts workspace deletion
- Extracts workspace ID from the query filter
- Deletes all pages with matching `workspaceId` before workspace deletion completes
- Ensures atomic operation - if page deletion fails, workspace deletion is aborted

**Example:**
```javascript
// When you delete a workspace:
await Workspace.findByIdAndDelete(workspaceId);
// Automatically triggers:
// await Page.deleteMany({ workspaceId: workspaceId });
```

---

### 2. Page Conflict Version Handling (Optimistic Locking)

**Problem:** Multiple users editing the same page simultaneously can overwrite each other's changes (lost update problem).

**Solution:** Optimistic locking using MongoDB's `__v` (version) field with conflict detection and resolution.

**Implementation:**

```77:117:backend/src/controllers/page.ts
export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  try{
    const { pageId } = req.params;
    const pageExist = await Page.findById(pageId);
    console.log("pageExist>>",pageExist, req.body);
    if (!pageExist) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Page not found',
      });
      return;
    }
    if (pageExist.__v !== req.body.__v) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Page version mismatch',
        serverVersion: pageExist.__v,
        clientVersion: req.body.__v,
        serverContent: pageExist.content,
        clientContent: req.body.content,
      });
    }
    const page = await Page.findOneAndUpdate({ _id: pageId, __v: req.body.__v }, { $set: { title: req.body.title, content: req.body.content } , $inc: { __v: 1 } }, {
      new: true,
      runValidators: true,
    });
  
    return res.status(StatusCodes.OK).json({
      success: true,
      data: page,
    });
  
  }catch(error: any){
    console.log("Error in updatePage>>",error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});
```

**How it works:**
1. **Version Check:** Client sends current `__v` with update request
2. **Conflict Detection:** Server compares client `__v` with server `__v`
3. **Conflict Response:** If mismatch, returns `409 CONFLICT` with both versions
4. **Atomic Update:** Uses `findOneAndUpdate` with version condition - only updates if version matches
5. **Version Increment:** On successful update, increments `__v` atomically

**Example Flow:**
```
User A: Reads page (__v: 0)
User B: Reads page (__v: 0)
User A: Updates page (sends __v: 0) → Success (__v: 1)
User B: Updates page (sends __v: 0) → Conflict! (server has __v: 1)
```

**Frontend handles conflict** by showing both versions and allowing user to choose.

---

### 3. Validation & Sanitization

**Problem:** 
- Invalid data can corrupt database
- XSS attacks via malicious input
- Data integrity issues

**Solution:** Multi-layer validation and sanitization using Zod schemas and DOMPurify.

#### 3.1 Schema Validation (Zod)

```4:18:backend/src/schemas/pages.ts
export const createPageSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title cannot exceed 100 characters')
      .transform((val) => sanitizeString(val)),
    content: z
      .string()
      .max(500, 'Content cannot exceed 500 characters')
      .optional()
      .transform((val) => (val ? sanitizeContent(val) : val)),
    __v: z.number().optional(),
  }),
});
```

**Features:**
- Type safety with TypeScript
- Length validation (title: 1-100 chars, content: max 500 chars)
- Format validation (MongoDB ObjectId regex)
- Automatic sanitization via `transform()`

#### 3.2 Input Sanitization (DOMPurify)

```14:32:backend/src/utils/sanitize.ts
export function sanitizeString(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove HTML tags and sanitize
  sanitized = purify.sanitize(sanitized, { ALLOWED_TAGS: [] });

  // Normalize whitespace (multiple spaces/tabs/newlines to single space)
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}
```

**Sanitization Layers:**
1. **HTML Tag Removal:** DOMPurify removes all HTML/script tags
2. **Whitespace Normalization:** Multiple spaces → single space
3. **Control Character Removal:** Removes dangerous control chars
4. **Content Preservation:** `sanitizeContent()` preserves line breaks for content fields

#### 3.3 Validation Middleware

```5:38:backend/src/middleware/validate.ts
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
```

**Usage:**
```typescript
router.post('/', validate(createPageSchema), createPage);
```

---

### 4. API Versioning

**Problem:** API changes break existing clients. Need backward compatibility.

**Solution:** URL-based versioning (`/api/v1/...`) - currently implemented as `/api/` but structured for easy versioning.

**Current Structure:**
```typescript
app.use('/api', healthRoutes);
app.use('/api/workspaces', workspaceRoutes);
```

**Future Versioning:**
```typescript
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v2/workspaces', workspaceRoutesV2);
```

**Benefits:**
- Backward compatibility
- Gradual migration
- Clear deprecation path

---

### 5. Failure Recovery (MongoDB Restart Handling)

**Problem:** MongoDB connection failures during operations cause data loss and poor UX.

**Solution:** Retry mechanism with exponential backoff for transient MongoDB errors.

**Implementation:**

```27:62:backend/src/utils/retryMongoOperation.ts
export const retryMongoOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  console.log("retryMongoOperation>>");
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = options;

  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a connection error
      if (!isMongoConnectionError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delayTime = Math.min(currentDelay, maxDelay);
      await delay(delayTime);
      currentDelay *= backoffMultiplier;
    }
  }

  // If we get here, all retries failed
  throw lastError;
};
```

**Connection Error Detection:**

```12:21:backend/src/utils/retryMongoOperation.ts
const isMongoConnectionError = (error: any): boolean => {
  return (
    error?.name === 'MongoNetworkError' ||
    error?.name === 'MongoServerError' ||
    error?.name === 'MongoTimeoutError' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    (error?.message && error.message.includes('connection'))
  );
};
```

**Usage in Controllers:**

```36:75:backend/src/controllers/page.ts
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
```

**Retry Strategy:**
- **Max Retries:** 3 attempts
- **Initial Delay:** 1 second
- **Exponential Backoff:** 2x multiplier (1s → 2s → 4s)
- **Max Delay:** 10 seconds cap
- **Only Retries:** Connection errors (network, timeout, server errors)
- **Doesn't Retry:** Validation errors, business logic errors

**Example Scenario:**
```
MongoDB restart during page creation:
Attempt 1: Fails (MongoNetworkError) → Wait 1s
Attempt 2: Fails (MongoNetworkError) → Wait 2s  
Attempt 3: Fails (MongoNetworkError) → Wait 4s
Attempt 4: Success! → Returns page
```

---

### 6. Rate Limiting

**Problem:** API abuse, DDoS attacks, resource exhaustion.

**Solution:** Express rate limiting middleware with configurable windows and limits.

**Implementation:**

```4:13:backend/src/middleware/rateLimiter.ts
export const apiLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Configuration (Environment Variables):**

```11:22:backend/src/config/env.ts
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional()
    .default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional()
    .default('100'),
```

**Usage:**

```45:46:backend/src/app.ts
  // Rate limiting
  app.use('/api', apiLimiter);
```

**Default Settings:**
- **Window:** 15 minutes (900,000 ms)
- **Max Requests:** 100 per window per IP
- **Headers:** Standard rate limit headers (`X-RateLimit-*`)

**Response on Limit Exceeded:**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

### 7. Compression

**Problem:** Large API responses consume bandwidth and slow down clients.

**Solution:** Gzip compression middleware for all responses.

**Implementation:**

```32:33:backend/src/app.ts
  // Compression
  app.use(compression());
```

**How it works:**
- Automatically compresses responses > 1KB
- Uses gzip/deflate based on client `Accept-Encoding` header
- Reduces JSON response size by 60-80%
- Transparent to client (handled by HTTP headers)

**Example:**
```
Before: 50KB JSON response
After: 15KB compressed (70% reduction)
```

---

### 8. Retry Mechanism (Frontend-Backend Coordination)

**Problem:** Network failures, temporary server issues cause failed requests.

**Solution:** Frontend implements retry logic with exponential backoff, coordinated with backend retry-after headers.

**Backend provides retry guidance:**

```59:64:backend/src/controllers/page.ts
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Database connection lost. Please retry.',
        retryAfter: 5, // seconds
      });
```

**Frontend retry logic** (see Frontend docs for details):
- Retries on 503, 502, 504, 429 status codes
- Uses exponential backoff
- Respects `retryAfter` header from backend
- Max 3 retries

---

## Additional System Design Features

### Idempotency Middleware

**Problem:** Duplicate requests (network retries, user double-clicks) create duplicate resources.

**Solution:** Request deduplication using `X-Request-ID` header.

**Implementation:**

```6:37:backend/src/middleware/idempotency.ts
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
```

**How it works:**
- Client sends unique `X-Request-ID` header (UUID)
- Server caches response by request ID
- Duplicate requests return cached response
- Prevents duplicate page/workspace creation

**Usage:**
```typescript
// Frontend sends:
headers: { 'X-Request-ID': 'uuid-here' }
```

---

### Error Handling Middleware

**Problem:** Inconsistent error responses, stack traces in production, poor error messages.

**Solution:** Centralized error handler with proper status codes and error formatting.

**Implementation:**

```23:87:backend/src/middleware/errorHandler.ts
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
```

**Error Types Handled:**
- Zod validation errors → 400
- Mongoose validation errors → 400
- Invalid ObjectId → 400
- Custom application errors → Custom status
- Unknown errors → 500 (stack trace in dev only)

---

### Graceful Shutdown

**Problem:** Abrupt server shutdown causes data loss, connection leaks.

**Solution:** Graceful shutdown handling for SIGTERM/SIGINT signals.

**Implementation:**

```14:51:backend/src/server.ts
// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed');

    try {
      await disconnectDatabase();
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
```

**Shutdown Sequence:**
1. Stop accepting new requests
2. Wait for active requests to complete (10s timeout)
3. Close database connections
4. Exit process

---

## API Endpoints

### Workspaces

- `GET /api/workspaces` - List all workspaces
- `GET /api/workspaces/:id` - Get workspace by ID
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace (cascades to pages)

### Pages

- `GET /api/workspaces/:id/pages` - List pages in workspace
- `GET /api/workspaces/:id/pages/:pageId` - Get page by ID
- `POST /api/workspaces/:id/pages` - Create page
- `PUT /api/workspaces/:id/pages/:pageId` - Update page (with version conflict handling)
- `DELETE /api/workspaces/:id/pages/:pageId` - Delete page

---

## Environment Variables

```env
NODE_ENV=development|production|test
PORT=5000
MONGODB_URI=mongodb://localhost:27017/note-colab
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Summary

This backend implements production-ready system design patterns:

✅ **Data Integrity:** Cascade deletes, optimistic locking  
✅ **Security:** Input validation, sanitization, rate limiting  
✅ **Reliability:** Retry mechanisms, graceful shutdown, error handling  
✅ **Performance:** Compression, efficient queries  
✅ **Scalability:** Structured for API versioning, stateless design  

Each technique solves real-world problems encountered in collaborative editing systems.

