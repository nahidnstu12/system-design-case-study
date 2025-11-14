"use client";

import { useState, useEffect } from "react";
import { Plus, AlertCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceCard } from "./workspace-card";
import { WorkspaceForm } from "./workspace-form";
import { workspaceApi } from "@/lib/workspace-api";
import { useToast } from "@/components/ui/toast";
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/types/workspace";

export function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null
  );
  const { addToast } = useToast();

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceApi.getAll();
      setWorkspaces(data);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
      console.error("Error fetching workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (data: CreateWorkspaceInput) => {
    try {
      await workspaceApi.create(data);
      addToast({
        title: "Workspace created",
        description: "Your workspace has been created successfully.",
        variant: "success",
      });
      await fetchWorkspaces();
    } catch (err: any) {
      addToast({
        title: "Failed to create workspace",
        description:
          err.message || "An error occurred while creating the workspace.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleUpdate = async (data: UpdateWorkspaceInput) => {
    if (!editingWorkspace) return;
    try {
      await workspaceApi.update(editingWorkspace._id, data);
      addToast({
        title: "Workspace updated",
        description: "Your workspace has been updated successfully.",
        variant: "success",
      });
      setEditingWorkspace(null);
      await fetchWorkspaces();
    } catch (err: any) {
      addToast({
        title: "Failed to update workspace",
        description:
          err.message || "An error occurred while updating the workspace.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workspaceApi.delete(id);
      addToast({
        title: "Workspace deleted",
        description: "Your workspace has been deleted successfully.",
        variant: "success",
      });
      await fetchWorkspaces();
    } catch (err: any) {
      addToast({
        title: "Failed to delete workspace",
        description:
          err.message || "An error occurred while deleting the workspace.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingWorkspace(null);
  };

  const handleFormSubmit = async (
    data: CreateWorkspaceInput | UpdateWorkspaceInput
  ) => {
    if (editingWorkspace) {
      await handleUpdate(data as UpdateWorkspaceInput);
    } else {
      await handleCreate(data as CreateWorkspaceInput);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground mt-1">Manage your workspaces</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold">Error loading workspaces</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={fetchWorkspaces}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Organize and manage your workspaces
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Get started by creating your first workspace to organize your
              work.
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace._id}
              workspace={workspace}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <WorkspaceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        workspace={editingWorkspace}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
