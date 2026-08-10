import mongoose, { Schema, type Types } from 'mongoose';

export type EventQuestionType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';

export interface IEventFormQuestion {
  id: string;
  label: string;
  type: EventQuestionType;
  required: boolean;
  options?: string[];
}

export interface IEvent {
  supplierId: Types.ObjectId;
  title: string;
  description?: string;
  imageUrl?: string;
  eventDate: Date;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  participationFormQuestions: IEventFormQuestion[];
  stats: {
    participants: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventFormQuestionSchema = new Schema<IEventFormQuestion>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    type: {
      type: String,
      enum: ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'],
      required: true,
      default: 'TEXT',
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true, maxlength: 200 }],
  },
  { _id: false }
);

const EventSchema = new Schema<IEvent>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 3000 },
    imageUrl: String,
    eventDate: { type: Date, required: true },
    organizer: { type: String, required: true, trim: true, maxlength: 200 },
    allowParticipation: { type: Boolean, default: true },
    participationFormEnabled: { type: Boolean, default: false },
    participationFormQuestions: { type: [EventFormQuestionSchema], default: [] },
    stats: {
      participants: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EventSchema.index({ supplierId: 1, createdAt: -1 });
EventSchema.index({ isActive: 1, eventDate: 1 });

export const Event =
  (mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema)) as mongoose.Model<IEvent>;
