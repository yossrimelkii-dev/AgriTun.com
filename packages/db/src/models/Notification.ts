import mongoose, { Schema, type Types } from 'mongoose';

export type NotificationType =
  | 'ORDER_NEW'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'REVIEW_NEW'
  | 'REVIEW_REPLY'
  | 'MESSAGE_NEW'
  | 'STOCK_LOW'
  | 'STOCK_OUT'
  | 'PROMOTION_STARTED'
  | 'PROMOTION_ENDED'
  | 'BADGE_UPGRADED'
  | 'BADGE_EXPIRED'
  | 'SUPPLIER_VERIFIED'
  | 'INVOICE_SENT'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'REPORT_RESOLVED'
  | 'SYSTEM';

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Date;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'ORDER_NEW', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED',
        'ORDER_CANCELLED', 'REVIEW_NEW', 'REVIEW_REPLY', 'MESSAGE_NEW',
        'STOCK_LOW', 'STOCK_OUT', 'PROMOTION_STARTED', 'PROMOTION_ENDED',
        'BADGE_UPGRADED', 'BADGE_EXPIRED', 'SUPPLIER_VERIFIED',
        'INVOICE_SENT', 'INVOICE_PAID', 'INVOICE_OVERDUE',
        'REPORT_RESOLVED', 'SYSTEM',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    link: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });

export const Notification =
  (mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)) as mongoose.Model<INotification>;
