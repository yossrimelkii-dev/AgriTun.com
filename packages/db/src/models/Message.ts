import mongoose, { Schema, type Types } from 'mongoose';

export interface IMessage {
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  threadId: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  attachments: Array<{ name: string; url: string; size: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    threadId: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    attachments: [
      {
        name: String,
        url: String,
        size: Number,
      },
    ],
  },
  { timestamps: true }
);

MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ recipientId: 1, isRead: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export const Message =
  (mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)) as mongoose.Model<IMessage>;
