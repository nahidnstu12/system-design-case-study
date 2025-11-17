import mongoose, { Schema, Document, Model, Query } from 'mongoose';
import { Page } from './pages';
import { NextFunction } from 'express';

export enum CommonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface IWorkspace extends Document {
  title: string;
  description?: string;
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    title: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: CommonStatus,
      default: CommonStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceSchema.pre(
  'findOneAndDelete' as any,
  async function (this: Query<IWorkspace | null, IWorkspace>, next: NextFunction) {
    try {
      const workspaceId = this.getFilter()._id;
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }
      await Page.deleteMany({ workspaceId });
      next();
    } catch (error) {
      next(error);
    }
  }
);

export const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspaces', WorkspaceSchema);
