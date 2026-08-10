import mongoose, { Schema, type Types } from 'mongoose';

export interface IReport {
  reporterId: Types.ObjectId;
  targetType: 'PRODUCT' | 'SUPPLIER';
  targetId: Types.ObjectId;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['PRODUCT', 'SUPPLIER'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });

export const Report =
  (mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema)) as mongoose.Model<IReport>;
