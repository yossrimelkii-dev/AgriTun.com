import mongoose, { Schema, type Types } from 'mongoose';

export interface IEventParticipationAnswer {
  questionId: string;
  label: string;
  value: string;
}

export interface IEventParticipation {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: IEventParticipationAnswer[];
  createdAt: Date;
  updatedAt: Date;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const EventParticipationAnswerSchema = new Schema<IEventParticipationAnswer>(
  {
    questionId: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    value: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const EventParticipationSchema = new Schema<IEventParticipation>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [EventParticipationAnswerSchema], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

EventParticipationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventParticipationSchema.index({ eventId: 1, createdAt: -1 });

export const EventParticipation =
  (mongoose.models.EventParticipation ||
    mongoose.model<IEventParticipation>('EventParticipation', EventParticipationSchema)) as mongoose.Model<IEventParticipation>;
