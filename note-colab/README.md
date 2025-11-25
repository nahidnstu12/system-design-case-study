# Collaborative Notes System - System Design Case Study

## 🎯 Goal

Design and implement a **collaborative notes system** where multiple users can edit pages in real-time, with proper architecture, caching, and persistence. This project serves as a **POC (Proof of Concept)** demonstrating core system design principles.

**Inspiration:** Simplified version of Notion or Google Docs, focused on learning system design patterns.

---

## 📋 System Requirements Solved

### Core Features
- ✅ Create and manage workspaces
- ✅ Create and manage pages within workspaces
- ✅ Real-time collaborative editing with conflict resolution
- ✅ Data persistence with MongoDB

### System Design Techniques Implemented

1. **Cascade Delete** - Workspace deletion automatically removes associated pages
2. **Page Conflict Version Handling** - Optimistic locking prevents lost updates
3. **Validation & Sanitization** - Multi-layer input validation and XSS protection
4. **API Versioning** - Structured for backward compatibility
5. **Failure Recovery** - MongoDB restart handling with retry mechanisms
6. **Rate Limiting** - API abuse prevention
7. **Compression** - Response compression for performance
8. **Retry Mechanism** - Exponential backoff for transient failures

---

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │  Next.js + React + TypeScript
│  (Port 3000)│
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────┐
│   Backend   │  Express + TypeScript + MongoDB
│  (Port 5000)│
└──────┬──────┘
       │
┌──────▼──────┐
│  MongoDB    │  Document Database
│ (Port 27017)│
└─────────────┘
```

### Technology Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- MongoDB + Mongoose
- Zod (validation)
- Express Rate Limit
- Compression middleware

**Frontend:**
- Next.js 16 (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui components

---

## 📁 Project Structure

```
note-colab/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, environment config
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/      # Rate limiting, validation, error handling
│   │   ├── models/           # Mongoose models (Workspace, Page)
│   │   ├── routes/           # Express routes
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── utils/            # Retry logic, sanitization
│   │   ├── app.ts            # Express app setup
│   │   └── server.ts         # Server entry point
│   ├── SYSTEM_DESIGN.md      # Backend system design documentation
│   └── README.md             # Backend setup guide
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # API client, utilities
│   │   └── types/            # TypeScript types
│   ├── SYSTEM_DESIGN.md      # Frontend system design documentation
│   └── README.md             # Frontend setup guide
│
└── README.md                 # This file

```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI

# Start MongoDB (if local)
mongod

# Run development server
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Run development server
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 📚 Documentation

### System Design Documentation

- **[Backend System Design](./SYSTEM_DESIGN_BACKEND.md)** - Comprehensive documentation of backend system design techniques
- **[Frontend System Design](./SYSTEM_DESIGN_FRONTEND.md)** - Frontend implementation patterns and conflict resolution

### Setup Guides

- **[Backend README](./backend/README.md)** - Backend setup and API documentation
- **[Frontend README](./frontend/README.md)** - Frontend setup guide

---

## 🔑 Key System Design Patterns Explained

### 1. Cascade Delete (Workspace → Pages)

**Problem:** Deleting a workspace leaves orphaned pages.

**Solution:** Mongoose pre-hook automatically deletes all pages when workspace is deleted.

**See:** [Backend Docs - Cascade Delete](./backend/SYSTEM_DESIGN.md#1-cascade-delete-workspace--pages)

---

### 2. Page Conflict Version Handling

**Problem:** Multiple users editing same page overwrite each other's changes.

**Solution:** Optimistic locking using MongoDB `__v` field with conflict detection.

**Flow:**
1. Client reads page (gets `__v: 0`)
2. Client edits and sends update with `__v: 0`
3. Server checks: if server `__v` ≠ client `__v`, return `409 CONFLICT`
4. Frontend shows conflict dialog with both versions
5. User chooses resolution strategy

**See:** 
- [Backend Docs - Version Handling](./backend/SYSTEM_DESIGN.md#2-page-conflict-version-handling-optimistic-locking)
- [Frontend Docs - Conflict Resolution](./frontend/SYSTEM_DESIGN.md#1-page-conflict-version-handling-optimistic-locking)

---

### 3. Validation & Sanitization

**Problem:** Invalid/malicious input corrupts database or enables XSS attacks.

**Solution:** Multi-layer validation:
1. **Zod schemas** - Type-safe validation with transforms
2. **DOMPurify** - HTML/script tag removal
3. **Mongoose validators** - Database-level validation

**See:** [Backend Docs - Validation](./backend/SYSTEM_DESIGN.md#3-validation--sanitization)

---

### 4. Failure Recovery (MongoDB Restart)

**Problem:** MongoDB connection failures during operations cause data loss.

**Solution:** Retry mechanism with exponential backoff:
- Detects connection errors (MongoNetworkError, MongoTimeoutError)
- Retries up to 3 times with exponential backoff (1s → 2s → 4s)
- Returns `503 SERVICE_UNAVAILABLE` with `retryAfter` header if all retries fail

**See:** [Backend Docs - Failure Recovery](./backend/SYSTEM_DESIGN.md#5-failure-recovery-mongodb-restart-handling)

---

### 5. Rate Limiting

**Problem:** API abuse, DDoS attacks, resource exhaustion.

**Solution:** Express rate limiting:
- 100 requests per 15 minutes per IP
- Returns `429 TOO_MANY_REQUESTS` when limit exceeded
- Configurable via environment variables

**See:** [Backend Docs - Rate Limiting](./backend/SYSTEM_DESIGN.md#6-rate-limiting)

---

### 6. Compression

**Problem:** Large API responses consume bandwidth.

**Solution:** Gzip compression middleware:
- Automatically compresses responses > 1KB
- Reduces JSON size by 60-80%
- Transparent to client

**See:** [Backend Docs - Compression](./backend/SYSTEM_DESIGN.md#7-compression)

---

### 7. Retry Mechanism (Frontend)

**Problem:** Network failures cause failed requests.

**Solution:** Frontend retry with exponential backoff:
- Retries on 503, 502, 504, 429, network errors
- Respects backend `retryAfter` header
- Max 3 retries with exponential backoff

**See:** [Frontend Docs - Retry Mechanism](./frontend/SYSTEM_DESIGN.md#2-retry-mechanism-with-exponential-backoff)

---

### 8. Idempotency

**Problem:** Duplicate requests (network retries, double-clicks) create duplicate resources.

**Solution:** Request deduplication using `X-Request-ID` header:
- Frontend generates UUID for POST requests
- Backend caches response by request ID
- Duplicate requests return cached response

**See:** 
- [Backend Docs - Idempotency](./backend/SYSTEM_DESIGN.md#idempotency-middleware)
- [Frontend Docs - Idempotency](./frontend/SYSTEM_DESIGN.md#3-idempotency-request-deduplication)

---

## 🧪 Testing Scenarios

### Test Cascade Delete
1. Create workspace with pages
2. Delete workspace
3. Verify all pages are deleted

### Test Conflict Resolution
1. Open same page in two browsers
2. Edit in both browsers
3. Save in first browser → Success
4. Save in second browser → Conflict dialog appears
5. Choose resolution strategy

### Test Retry Mechanism
1. Start backend
2. Create page
3. Stop MongoDB
4. Try to create another page → Should retry
5. Start MongoDB → Should succeed

### Test Rate Limiting
1. Make 100+ requests rapidly
2. Verify 429 response after limit

---

## 📊 API Endpoints

### Workspaces
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/:id` - Get workspace
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace (cascades to pages)

### Pages
- `GET /api/workspaces/:id/pages` - List pages
- `GET /api/workspaces/:id/pages/:pageId` - Get page
- `POST /api/workspaces/:id/pages` - Create page
- `PUT /api/workspaces/:id/pages/:pageId` - Update page (with version check)
- `DELETE /api/workspaces/:id/pages/:pageId` - Delete page

---

## 🔒 Security Features

- ✅ Input validation (Zod schemas)
- ✅ XSS protection (DOMPurify sanitization)
- ✅ Rate limiting (abuse prevention)
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ MongoDB injection prevention (Mongoose)

---

## 🚧 Future Enhancements

- [ ] Real-time collaboration (WebSockets)
- [ ] User authentication & authorization
- [ ] Page history/versioning
- [ ] Search functionality
- [ ] File attachments
- [ ] Comments and mentions
- [ ] Offline support (Service Workers)
- [ ] Redis caching layer
- [ ] Load balancing
- [ ] Database replication

---

## 📖 Learning Outcomes

This project demonstrates:

1. **Data Consistency:** Cascade deletes, optimistic locking
2. **Reliability:** Retry mechanisms, graceful shutdown, error handling
3. **Security:** Input validation, sanitization, rate limiting
4. **Performance:** Compression, efficient queries
5. **Scalability:** API versioning, stateless design
6. **User Experience:** Conflict resolution, loading states, error handling

---

## 📝 License

This is a learning project for system design case study purposes.

---

## 🙏 Acknowledgments

Built as a system design case study following best practices for collaborative editing systems.

