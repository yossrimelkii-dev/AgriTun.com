import mongoose, { Schema, type Types } from 'mongoose';

export interface IAgriHelpDiscussionMessage {
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface IAgriHelpFeedback {
  stars?: number;
  comment?: string;
  createdAt?: Date;
}

export interface IAgriHelpRequest {
  peasantId: Types.ObjectId;
  engineerId?: Types.ObjectId;
  speciality: string;
  title: string;
  description: string;
  imageUrls: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  discussion: IAgriHelpDiscussionMessage[];
  engineerRecommendation?: string;
  peasantResult?: string;
  feedback?: IAgriHelpFeedback;
  createdAt: Date;
  updatedAt: Date;
}

const AgriHelpRequestSchema = new Schema<IAgriHelpRequest>(
  {
    peasantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    engineerId: { type: Schema.Types.ObjectId, ref: 'User' },
    speciality: { type: String, required: true, trim: true, maxlength: 160 },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, maxlength: 4000 },
    imageUrls: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    discussion: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true, maxlength: 4000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    engineerRecommendation: { type: String, maxlength: 6000 },
    peasantResult: { type: String, maxlength: 6000 },
    feedback: {
      stars: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 2000 },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

AgriHelpRequestSchema.index({ peasantId: 1, createdAt: -1 });
AgriHelpRequestSchema.index({ engineerId: 1, createdAt: -1 });
AgriHelpRequestSchema.index({ status: 1, createdAt: -1 });
AgriHelpRequestSchema.index({ speciality: 1 });

export const AgriHelpRequest =
  (mongoose.models.AgriHelpRequest ||
    mongoose.model<IAgriHelpRequest>('AgriHelpRequest', AgriHelpRequestSchema)) as mongoose.Model<IAgriHelpRequest>;
