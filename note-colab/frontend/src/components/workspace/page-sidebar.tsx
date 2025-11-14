'use client';

import { useState } from 'react';
import { Plus, FileText, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Page } from '@/types/page';

interface PageSidebarProps {
  pages: Page[];
  selectedPageId: string | null;
  loading: boolean;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => Promise<void>;
  workspaceTitle: string;
}

export function PageSidebar({
  pages,
  selectedPageId,
  loading,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  workspaceTitle,
}: PageSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this page?')) {
      setDeletingId(pageId);
      try {
        await onDeletePage(pageId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg truncate">{workspaceTitle}</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          onClick={onCreatePage}
          className="w-full mt-3"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Page
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No pages found' : 'No pages yet. Create one to get started.'}
          </div>
        ) : (
          <div className="p-2">
            {filteredPages.map((page) => (
              <div
                key={page._id}
                className={cn(
                  'group relative flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors mb-1',
                  selectedPageId === page._id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                onClick={() => onSelectPage(page._id)}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">
                  {page.title}
                </span>
                {deletingId === page._id ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                      selectedPageId === page._id && 'opacity-100'
                    )}
                    onClick={(e) => handleDelete(e, page._id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

