'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import type { ApiError } from '@/lib/api';
import { pageApi } from '@/lib/page-api';
import { sanitize } from '@/lib/utils';
import type { CreatePageInput, Page, UpdatePageInput } from '@/types/page';
import { AlertTriangle, FileText, Loader2, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PageEditorProps {
  page: Page | null;
  workspaceId: string;
  onSave: (data: CreatePageInput | UpdatePageInput) => Promise<void>;
  onPageChange?: (page: Page | null) => void;
}

export function PageEditor({ page, workspaceId, onSave, onPageChange }: PageEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [conflictError, setConflictError] = useState<ApiError | null>(null);
  const { addToast } = useToast();
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content || '');
      setHasChanges(false);
      titleInputRef.current?.focus();
    } else {
      setTitle('');
      setContent('');
      setHasChanges(false);
    }
  }, [page]);

  useEffect(() => {
    if (page) {
      const titleChanged = title !== page.title;
      const contentChanged = content !== (page.content || '');
      setHasChanges(titleChanged || contentChanged);
    } else {
      setHasChanges(title.trim().length > 0 || content.trim().length > 0);
    }
  }, [title, content, page]);

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

  const handleSaveClick = () => {
    handleSave();
  };

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

  if (!page && !hasChanges) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No page selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a page from the sidebar or create a new one to start editing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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

      <div className="flex flex-col h-full bg-background">
        <div className="border-b p-4 flex items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title..."
            className="text-xl font-semibold border-0 focus-visible:ring-0 px-0 h-auto"
            maxLength={100}
          />
        </div>
        <Button
          onClick={handleSaveClick}
          disabled={isSaving || !hasChanges || !title.trim()}
          size="sm"
        >
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
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your content here..."
            className="min-h-[500px] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed font-normal"
            maxLength={500}
          />
          <div className="mt-4 text-xs text-muted-foreground">Current Version: {page?.__v}</div>
          <div className="mt-4 text-xs text-muted-foreground text-right">
            {content.length}/500 characters
            {hasChanges && (
              <span className="ml-2 text-orange-500">• Unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

