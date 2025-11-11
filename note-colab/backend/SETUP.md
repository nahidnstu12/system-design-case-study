# Step-by-Step Setup Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- **Express** - Web framework
- **Mongoose** - MongoDB ODM
- **TypeScript** - Type safety
- **Zod** - Schema validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **express-rate-limit** - Rate limiting
- **compression** - Response compression

## Step 2: Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
# Copy the example (if you created .env.example)
# Or create manually:
```

Add these variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/note-colab
```

**For MongoDB Atlas (cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/note-colab?retryWrites=true&w=majority
```

**Optional variables:**
```env
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Step 3: Start MongoDB

**Local MongoDB:**
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

**Or use MongoDB Atlas** (cloud) - no local installation needed.

## Step 4: Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

You should see:
```
🚀 Server running in development mode on port 5000
MongoDB Connected: localhost:27017
```

## Step 5: Test the API

**Health Check:**
```bash
curl http://localhost:5000/health
# or
curl http://localhost:5000/api/health
```

**Example CRUD endpoints:**
```bash
# Create
curl -X POST http://localhost:5000/api/examples \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test description"}'

# Get all
curl http://localhost:5000/api/examples

# Get by ID (replace ID)
curl http://localhost:5000/api/examples/{id}

# Update (replace ID)
curl -X PUT http://localhost:5000/api/examples/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated"}'

# Delete (replace ID)
curl -X DELETE http://localhost:5000/api/examples/{id}
```

## Step 6: Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Project Structure Explained

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts    # Mongoose connection
│   │   └── env.ts         # Environment validation with Zod
│   ├── controllers/       # Route handlers (business logic)
│   ├── middleware/        # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── validate.ts   # Zod validation middleware
│   │   ├── rateLimiter.ts
│   │   └── notFound.ts
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Route definitions
│   ├── schemas/           # Zod validation schemas
│   ├── utils/             # Helper functions
│   ├── app.ts             # Express app configuration
│   └── server.ts          # Server entry point
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── .env                   # Environment variables (create this)
```

## Creating New Features

### 1. Create Model (`src/models/user.model.ts`)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
```

### 2. Create Zod Schema (`src/schemas/user.schema.ts`)

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(1, 'Name is required'),
  }),
});
```

### 3. Create Controller (`src/controllers/user.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { User } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.create(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: user,
  });
});
```

### 4. Create Routes (`src/routes/user.routes.ts`)

```typescript
import { Router } from 'express';
import { createUser } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { createUserSchema } from '../schemas/user.schema';

const router = Router();
router.post('/', validate(createUserSchema), createUser);
export { router as userRoutes };
```

### 5. Add to App (`src/app.ts`)

```typescript
import { userRoutes } from './routes/user.routes';
// ...
app.use('/api/users', userRoutes);
```

## Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong MongoDB connection string
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Set up proper rate limiting values
- [ ] Enable HTTPS in production
- [ ] Set up logging service (Winston, etc.)
- [ ] Configure process manager (PM2)
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Add database indexes for performance
- [ ] Set up CI/CD pipeline

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Compile TypeScript
npm start                # Run production build

# Code Quality
npm run lint             # Check for linting errors
npm run lint:fix         # Auto-fix linting errors
npm run format           # Format code with Prettier
npm run type-check       # Type check without building

# Cleanup
npm run clean            # Remove dist folder
```

## Troubleshooting

**Port already in use:**
- Change `PORT` in `.env` or kill the process using port 5000

**MongoDB connection failed:**
- Check if MongoDB is running: `mongosh` or check MongoDB service
- Verify `MONGODB_URI` in `.env` is correct
- For Atlas: Check IP whitelist and credentials

**TypeScript errors:**
- Run `npm run type-check` to see all errors
- Ensure all imports are correct

**Validation errors:**
- Check Zod schema matches request body structure
- Verify middleware order in `app.ts`

