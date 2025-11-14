import mongoose, { Schema, Document, Model } from 'mongoose';

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

export const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspaces', WorkspaceSchema);
