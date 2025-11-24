'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sanitize } from '@/lib/utils';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from '@/types/workspace';
import { useEffect, useState } from 'react';

interface WorkspaceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace?: Workspace | null;
  onSubmit: (data: CreateWorkspaceInput | UpdateWorkspaceInput) => Promise<void>;
}

export function WorkspaceForm({ open, onOpenChange, workspace, onSubmit }: WorkspaceFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspace) {
      setTitle(workspace.title);
      setDescription(workspace.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
    setError(null);
  }, [workspace, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      await onSubmit({
        title: sanitize(title.trim()),
        description: sanitize(description.trim()),
      });

      onOpenChange(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to save workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{workspace ? 'Edit Workspace' : 'Create New Workspace'}</DialogTitle>
          <DialogDescription>
            {workspace
              ? 'Update your workspace details below.'
              : 'Create a new workspace to organize your work.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter workspace title"
                maxLength={100}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter workspace description (optional)"
                maxLength={500}
                rows={4}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : workspace ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

