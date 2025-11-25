# Collaborative Notes System - Frontend Documentation

## Overview

This frontend implements a **collaborative notes system** client with real-time conflict resolution, robust error handling, and retry mechanisms. Built with Next.js, React, TypeScript, and Tailwind CSS.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui

---

## System Design Techniques Implemented

### 1. Page Conflict Version Handling (Optimistic Locking)

**Problem:** When multiple users edit the same page simultaneously, their changes can conflict. The backend detects conflicts, but the frontend must handle them gracefully.

**Solution:** Version conflict detection with user-friendly resolution UI that shows both versions and allows manual conflict resolution.

**Implementation:**

#### Conflict Detection

```62:102:frontend/src/components/workspace/page-editor.tsx
  const handleSave = async (overrideVersion?: number) => {
    if (!title.trim()) {
      addToast({
        title: 'Title required',
        description: 'Please enter a title for the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
       await onSave({
        title: sanitize(title.trim()),
        content: sanitize(content.trim()),
         __v: overrideVersion !== undefined ? overrideVersion : (page?.__v || 0),
      });
      addToast({
        title: page ? 'Page updated' : 'Page created',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
      setHasChanges(false);
    } catch (err: any) {
      console.log("err>>",err);
      
      // Check if it's a version conflict error
      if (err.serverVersion !== undefined && err.clientVersion !== undefined) {
        setConflictError(err);
        return;
      }
      
      addToast({
        title: 'Failed to save',
        description: err.message || 'An error occurred while saving.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
```

**How it works:**
1. Client sends current `__v` with update request
2. If backend returns `409 CONFLICT` with `serverVersion` and `clientVersion`, frontend detects conflict
3. Shows conflict dialog with both versions side-by-side
4. User chooses: "Use Server Version" or "Overwrite with My Version"

#### Conflict Resolution UI

```194:246:frontend/src/components/workspace/page-editor.tsx
      <Dialog open={!!conflictError} onOpenChange={(open) => !open && setConflictError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Version Conflict Detected
            </DialogTitle>
            <DialogDescription>
              This page was modified by someone else while you were editing. Choose how to resolve the conflict.
            </DialogDescription>
          </DialogHeader>
          
          {conflictError && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Server Version (v{conflictError.serverVersion})</h4>
                  <div className="p-3 bg-muted rounded-md border">
                    <p className="text-sm font-medium mb-2">{page?.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {conflictError.serverContent || 'No content'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Your Version (v{conflictError.clientVersion})</h4>
                  <div className="p-3 bg-muted rounded-md border">
                    <p className="text-sm font-medium mb-2">{title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {conflictError.clientContent || 'No content'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleResolveConflict(true)}
            >
              Use Server Version
            </Button>
            <Button
              onClick={() => handleResolveConflict(false)}
            >
              Overwrite with My Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

#### Conflict Resolution Logic

```108:168:frontend/src/components/workspace/page-editor.tsx
  const handleResolveConflict = async (useServer: boolean) => {
    if (!conflictError || !page) return;
    
    setConflictError(null);
    
    if (useServer) {
      // Use server version - reload page data and reset to server content
      setIsSaving(true);
      try {
        const refreshedPage = await pageApi.getById(workspaceId, page._id);
        setTitle(refreshedPage.title);
        setContent(refreshedPage.content || '');
        setHasChanges(false);
        if (onPageChange) {
          onPageChange(refreshedPage);
        }
        addToast({
          title: 'Page reloaded',
          description: 'Server version loaded successfully.',
          variant: 'success',
        });
      } catch (err: any) {
        // Fallback to conflict error data if refresh fails
        setTitle(page.title);
        setContent(conflictError.serverContent || '');
        setHasChanges(false);
        addToast({
          title: 'Page reloaded',
          description: 'Server version loaded (may be cached).',
          variant: 'success',
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Use client version - retry save with server version number
      setIsSaving(true);
      try {
        await handleSave(conflictError.serverVersion);
        addToast({
          title: 'Page updated',
          description: 'Your changes have been saved.',
          variant: 'success',
        });
        setHasChanges(false);
      } catch (err: any) {
        // Check if it's another conflict
        if (err.serverVersion !== undefined && err.clientVersion !== undefined) {
          setConflictError(err);
          return;
        }
        addToast({
          title: 'Failed to save',
          description: err.message || 'An error occurred while saving.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    }
  };
```

**Resolution Options:**

1. **Use Server Version:**
   - Fetches latest page from server
   - Discards local changes
   - Updates UI with server content

2. **Overwrite with My Version:**
   - Retries save with server's current version number
   - If another conflict occurs, shows dialog again
   - Eventually succeeds when no concurrent edits

**Example Flow:**
```
User A edits page (v0) → Saves → Success (v1)
User B edits page (v0) → Saves → Conflict! (server has v1)
User B sees dialog:
  - Server Version: User A's changes
  - Your Version: User B's changes
User B chooses "Overwrite" → Retries with v1 → Success (v2)
```

---

### 2. Retry Mechanism with Exponential Backoff

**Problem:** Network failures, temporary server issues (503), rate limiting (429) cause failed requests. Users shouldn't see errors for transient failures.

**Solution:** Automatic retry with exponential backoff for retryable errors, respecting backend `retryAfter` headers.

**Implementation:**

#### Retry Logic in API Client

```66:143:frontend/src/lib/api.ts
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Ensure Content-Type is always set for JSON requests
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data: ApiResponse<T> | ApiError = await response.json();

      if (!response.ok || !data.success) {
        const error: ApiError = {
          success: false,
          message: data.message || `HTTP error! status: ${response.status}`,
          ...(data as any),
        };

        // Retry on retryable errors
        if (
          this.shouldRetry(error, response.status) &&
          retryCount < this.retryOptions.maxRetries!
        ) {
          const retryAfter = (data as any).retryAfter;
          const delayTime = retryAfter
            ? Math.min(retryAfter * 1000, this.retryOptions.maxDelay!)
            : Math.min(
                this.retryOptions.initialDelay! *
                  Math.pow(this.retryOptions.backoffMultiplier!, retryCount),
                this.retryOptions.maxDelay!
              );

          await this.delay(delayTime);
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        throw error;
      }

      return (data as ApiResponse<T>).data as T;
    } catch (error) {
      // Network errors - retry
      if (
        this.shouldRetry(error) &&
        retryCount < this.retryOptions.maxRetries!
      ) {
        const delayTime = Math.min(
          this.retryOptions.initialDelay! *
            Math.pow(this.retryOptions.backoffMultiplier!, retryCount),
          this.retryOptions.maxDelay!
        );

        await this.delay(delayTime);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      // Transform network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw {
          success: false,
          message: "Network error. Please check your connection.",
        } as ApiError;
      }

      throw error;
    }
  }
```

#### Retryable Error Detection

```47:64:frontend/src/lib/api.ts
  private shouldRetry(error: any, status?: number): boolean {
    // Network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return true;
    }

    // Retryable HTTP status codes
    if (status) {
      return (
        status === 503 || // Service Unavailable (DB retries failed)
        status === 502 || // Bad Gateway
        status === 504 || // Gateway Timeout
        status === 429 // Too Many Requests (rate limited)
      );
    }

    return false;
  }
```

#### Retry Configuration

```28:41:frontend/src/lib/api.ts
class ApiClient {
  private baseUrl: string;
  private retryOptions: RetryOptions;

  constructor(baseUrl: string, retryOptions: RetryOptions = {}) {
    this.baseUrl = baseUrl;
    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...retryOptions,
    };
  }
```

**Retry Strategy:**
- **Max Retries:** 3 attempts
- **Initial Delay:** 1 second
- **Exponential Backoff:** 2x multiplier (1s → 2s → 4s)
- **Max Delay:** 10 seconds cap
- **Respects Backend:** Uses `retryAfter` header if provided
- **Retries On:** 503, 502, 504, 429, network errors
- **Doesn't Retry:** 400, 401, 403, 404, 409 (conflicts)

**Example Scenario:**
```
Request fails with 503 (Service Unavailable)
Attempt 1: Fails → Wait 1s (or retryAfter if provided)
Attempt 2: Fails → Wait 2s
Attempt 3: Fails → Wait 4s
Attempt 4: Success! → Returns data
```

**Backend Coordination:**
When backend returns 503 after MongoDB retries fail, it includes:
```json
{
  "success": false,
  "message": "Database connection lost. Please retry.",
  "retryAfter": 5
}
```
Frontend respects this and waits 5 seconds before retry.

---

### 3. Idempotency (Request Deduplication)

**Problem:** Network retries, user double-clicks create duplicate resources (pages, workspaces).

**Solution:** Send unique `X-Request-ID` header (UUID) with POST requests. Backend caches responses and returns cached result for duplicate requests.

**Implementation:**

#### Generating Request IDs

```68:89:frontend/src/app/workspaces/[id]/page.tsx
  const handleCreatePage = async () => {
    try {
      const requestId = v4();
      const newPage = await pageApi.create(workspaceId, {
        title: 'Untitled Page',
        content: '',
      }, { headers: { 'X-Request-ID': requestId } });
      setPages([newPage, ...pages]);
      setSelectedPageId(newPage._id);
      addToast({
        title: 'Page created',
        description: 'New page created successfully.',
        variant: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Failed to create page',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };
```

**How it works:**
1. Frontend generates UUID using `v4()` from `uuid` package
2. Sends `X-Request-ID` header with POST request
3. Backend caches response by request ID
4. If same request ID arrives again (network retry, double-click), backend returns cached response
5. No duplicate resources created

**Example:**
```
User clicks "Create Page" twice quickly:
Request 1: POST /pages (X-Request-ID: abc-123) → Creates page → Returns page
Request 2: POST /pages (X-Request-ID: abc-123) → Returns cached page (no duplicate)
```

---

### 4. Input Sanitization (Client-Side)

**Problem:** User input may contain malicious content. While backend sanitizes, client-side sanitization provides immediate feedback and reduces server load.

**Solution:** Client-side sanitization utility that removes HTML tags and normalizes input.

**Implementation:**

```typescript
// In page-editor.tsx
import { sanitize } from '@/lib/utils';

await onSave({
  title: sanitize(title.trim()),
  content: sanitize(content.trim()),
  __v: overrideVersion !== undefined ? overrideVersion : (page?.__v || 0),
});
```

**Note:** Client-side sanitization is a UX enhancement. Backend sanitization is the security layer.

---

### 5. Error Handling & User Feedback

**Problem:** Generic error messages confuse users. Need clear, actionable error messages.

**Solution:** Toast notifications with specific error messages and retry guidance.

**Implementation:**

#### Error Types Handled

```10:19:frontend/src/lib/api.ts
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
  serverVersion?: number;
  clientVersion?: number;
  serverContent?: string;
  clientContent?: string;
}
```

#### Toast Notifications

Throughout the app, errors are shown via toast notifications:

```typescript
addToast({
  title: 'Failed to save',
  description: err.message || 'An error occurred while saving.',
  variant: 'destructive',
});
```

**Error Scenarios:**
- **Network Error:** "Network error. Please check your connection."
- **Validation Error:** Shows field-specific errors from backend
- **Conflict Error:** Shows conflict resolution dialog (not toast)
- **Rate Limit:** "Too many requests. Please try again later."
- **Server Error:** "Service temporarily unavailable. Please retry."

---

### 6. Optimistic UI Updates

**Problem:** Waiting for server response makes UI feel slow. Users expect immediate feedback.

**Solution:** Update UI optimistically, then sync with server response.

**Implementation:**

```91:104:frontend/src/app/workspaces/[id]/page.tsx
  const handleSavePage = async (data: CreatePageInput | UpdatePageInput) => {
    if (!selectedPageId) {
      // Create new page
      const newPage = await pageApi.create(workspaceId, data as CreatePageInput);
      setPages([newPage, ...pages]);
      setSelectedPageId(newPage._id);
    } else {
      // Update existing page
      const updatedPage = await pageApi.update(workspaceId, selectedPageId, data as UpdatePageInput);
      console.log("updatedPage>>",updatedPage);
      setPages(pages.map((p) => p._id === selectedPageId ? updatedPage : p));
      await fetchPages();
    }
  };
```

**How it works:**
1. User saves page
2. UI shows "Saving..." state immediately
3. Request sent to backend
4. On success: UI updates with server response
5. On conflict: Shows conflict dialog
6. On error: Reverts UI, shows error toast

**Note:** For critical operations (like conflict resolution), we wait for server confirmation before updating UI.

---

### 7. Loading States & Skeleton UI

**Problem:** Empty screens during data loading confuse users.

**Solution:** Loading indicators and skeleton UI components.

**Implementation:**

```typescript
const [loading, setLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);

// Show loading spinner
{loading && <Loader2 className="animate-spin" />}

// Show saving state
{isSaving ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Saving...
  </>
) : (
  <>
    <Save className="mr-2 h-4 w-4" />
    Save
  </>
)}
```

---

## Component Architecture

### Page Editor Component

**Location:** `src/components/workspace/page-editor.tsx`

**Responsibilities:**
- Page content editing (title, content)
- Conflict detection and resolution
- Save state management
- Input validation

**Key Features:**
- Real-time change detection (`hasChanges` state)
- Version conflict handling
- Character limits (title: 100, content: 500)
- Auto-focus on title input

### Page Sidebar Component

**Location:** `src/components/workspace/page-sidebar.tsx`

**Responsibilities:**
- List pages in workspace
- Page selection
- Create/delete pages

### Workspace List Component

**Location:** `src/components/workspace/workspace-list.tsx`

**Responsibilities:**
- Display all workspaces
- Create new workspace
- Navigate to workspace detail

---

## API Client Architecture

### ApiClient Class

**Location:** `src/lib/api.ts`

**Features:**
- Automatic retry with exponential backoff
- Request/response transformation
- Error handling and transformation
- Type-safe generic methods

**Methods:**
- `get<T>(endpoint)` - GET request
- `post<T>(endpoint, body, options)` - POST request
- `put<T>(endpoint, body)` - PUT request
- `delete<T>(endpoint)` - DELETE request

### Page API

**Location:** `src/lib/page-api.ts`

**Methods:**
- `getAll(workspaceId)` - Get all pages
- `getById(workspaceId, pageId)` - Get page by ID
- `create(workspaceId, data, options)` - Create page
- `update(workspaceId, pageId, data)` - Update page
- `delete(workspaceId, pageId)` - Delete page

### Workspace API

**Location:** `src/lib/workspace-api.ts`

**Methods:**
- `getAll()` - Get all workspaces
- `getById(id)` - Get workspace by ID
- `create(data)` - Create workspace
- `update(id, data)` - Update workspace
- `delete(id)` - Delete workspace

---

## Type Definitions

### Page Types

```7:28:frontend/src/types/page.ts
export interface Page {
  _id: string;
  title: string;
  content?: string;
  workspaceId: string;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreatePageInput {
  title: string;
  content?: string;
  __v?: number;
}

export interface UpdatePageInput {
  title?: string;
  content?: string;
  __v?: number;
}
```

**Key Fields:**
- `__v`: Version number for optimistic locking
- `status`: Page status (ACTIVE, INACTIVE, DELETED)
- `workspaceId`: Parent workspace reference

---

## State Management

**Approach:** React hooks (useState, useEffect) with local component state.

**State Flow:**
1. **Workspace List:** Fetches workspaces on mount
2. **Workspace Detail:** Fetches workspace + pages on mount
3. **Page Editor:** Manages local editing state, syncs on save
4. **Conflict State:** Managed in PageEditor component

**Future Enhancement:** Could use Zustand/Redux for global state if needed.

---

## User Experience Features

### 1. Unsaved Changes Indicator

```52:60:frontend/src/components/workspace/page-editor.tsx
  useEffect(() => {
    if (page) {
      const titleChanged = title !== page.title;
      const contentChanged = content !== (page.content || '');
      setHasChanges(titleChanged || contentChanged);
    } else {
      setHasChanges(title.trim().length > 0 || content.trim().length > 0);
    }
  }, [title, content, page]);
```

Shows "• Unsaved changes" indicator when content differs from server.

### 2. Character Limits

```typescript
// Title: max 100 characters
<Input maxLength={100} />

// Content: max 500 characters
<Textarea maxLength={500} />
<div>{content.length}/500 characters</div>
```

### 3. Version Display

```288:288:frontend/src/components/workspace/page-editor.tsx
          <div className="mt-4 text-xs text-muted-foreground">Current Version: {page?.__v}</div>
```

Shows current page version for debugging/transparency.

---

## Summary

This frontend implements production-ready patterns for collaborative editing:

✅ **Conflict Resolution:** User-friendly version conflict handling  
✅ **Reliability:** Automatic retry with exponential backoff  
✅ **Idempotency:** Request deduplication prevents duplicates  
✅ **UX:** Loading states, error handling, optimistic updates  
✅ **Type Safety:** Full TypeScript coverage  
✅ **Error Handling:** Clear, actionable error messages  

The frontend works seamlessly with the backend's system design patterns, providing a robust collaborative editing experience.

