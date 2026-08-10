import mongoose, { Schema, type Types } from 'mongoose';

export interface IAuditLog {
  userId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: Schema.Types.ObjectId,
  details: Schema.Types.Mixed,
  ipAddress: String,
  createdAt: { type: Date, default: Date.now },
});

AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog =
  (mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)) as mongoose.Model<IAuditLog>;
