import mongoose, { Schema, Document, Model } from 'mongoose';

export enum CommonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export interface IPage extends Document {
  title: string;
  content?: string;
  workspaceId: mongoose.Types.ObjectId;
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    title: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: [500, 'Content cannot exceed 500 characters'],
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
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

export const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
