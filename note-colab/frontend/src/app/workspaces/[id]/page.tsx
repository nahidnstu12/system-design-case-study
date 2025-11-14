'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSidebar } from '@/components/workspace/page-sidebar';
import { PageEditor } from '@/components/workspace/page-editor';
import { pageApi } from '@/lib/page-api';
import { workspaceApi } from '@/lib/workspace-api';
import { useToast } from '@/components/ui/toast';
import type { Page, CreatePageInput, UpdatePageInput } from '@/types/page';
import type { Workspace } from '@/types/workspace';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchWorkspace();
    fetchPages();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const data = await workspaceApi.getById(workspaceId);
      setWorkspace(data);
    } catch (err: any) {
      addToast({
        title: 'Failed to load workspace',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
      router.push('/');
    }
  };

  const fetchPages = async () => {
    try {
      setPagesLoading(true);
      const data = await pageApi.getAll(workspaceId);
      setPages(data);
      if (data.length > 0 && !selectedPageId) {
        setSelectedPageId(data[0]._id);
      }
    } catch (err: any) {
      addToast({
        title: 'Failed to load pages',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setPagesLoading(false);
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    try {
      const newPage = await pageApi.create(workspaceId, {
        title: 'Untitled Page',
        content: '',
      });
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

  const handleSavePage = async (data: CreatePageInput | UpdatePageInput) => {
    if (!selectedPageId) {
      // Create new page
      const newPage = await pageApi.create(workspaceId, data as CreatePageInput);
      setPages([newPage, ...pages]);
      setSelectedPageId(newPage._id);
    } else {
      // Update existing page
      await pageApi.update(workspaceId, selectedPageId, data as UpdatePageInput);
      await fetchPages();
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      await pageApi.delete(workspaceId, pageId);
      setPages(pages.filter((p) => p._id !== pageId));
      if (selectedPageId === pageId) {
        const remainingPages = pages.filter((p) => p._id !== pageId);
        setSelectedPageId(remainingPages.length > 0 ? remainingPages[0]._id : null);
      }
      addToast({
        title: 'Page deleted',
        description: 'Page deleted successfully.',
        variant: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Failed to delete page',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const selectedPage = pages.find((p) => p._id === selectedPageId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 shrink-0">
        <PageSidebar
          pages={pages}
          selectedPageId={selectedPageId}
          loading={pagesLoading}
          onSelectPage={setSelectedPageId}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          workspaceTitle={workspace?.title || 'Workspace'}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workspaces
          </Button>
        </div>
        <PageEditor
          page={selectedPage}
          workspaceId={workspaceId}
          onSave={handleSavePage}
        />
      </div>
    </div>
  );
}

