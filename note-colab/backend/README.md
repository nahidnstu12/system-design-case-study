# Backend API

Express + Mongoose + TypeScript + Zod backend setup.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```bash
cp .env.example .env
```

3. **Configure environment variables in `.env`:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/note-colab
```

4. **Run in development:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
npm start
```

## Project Structure

```
src/
├── config/          # Configuration files (database, env)
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # Route definitions
├── schemas/         # Zod validation schemas
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without building

## Features

- ✅ TypeScript with strict mode
- ✅ Zod validation
- ✅ Mongoose ODM
- ✅ Error handling middleware
- ✅ Rate limiting
- ✅ CORS & Security headers (Helmet)
- ✅ Request logging (Morgan)
- ✅ Graceful shutdown
- ✅ Environment variable validation

