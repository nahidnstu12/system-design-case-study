'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import type { Page, CreatePageInput, UpdatePageInput } from '@/types/page';
import { sanitize } from '@/lib/utils';

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

  const handleSave = async () => {
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
      });
      addToast({
        title: page ? 'Page updated' : 'Page created',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
      setHasChanges(false);
    } catch (err: any) {
      addToast({
        title: 'Failed to save',
        description: err.message || 'An error occurred while saving.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
          onClick={handleSave}
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
          <div className="mt-4 text-xs text-muted-foreground text-right">
            {content.length}/500 characters
            {hasChanges && (
              <span className="ml-2 text-orange-500">• Unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

