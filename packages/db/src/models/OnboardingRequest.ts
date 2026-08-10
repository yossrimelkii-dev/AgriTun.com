import mongoose, { Schema, type Types } from 'mongoose';

export interface IOnboardingRequest {
  firstName: string;
  lastName: string;
  professional: 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION';
  phoneNumber: string;
  companyName?: string;
  email?: string;
  location?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingRequestSchema = new Schema<IOnboardingRequest>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    professional: {
      type: String,
      enum: ['AGRICULTEUR', 'FOURNISSEUR', 'SPECIALIST', 'CENTRE_DE_FORMATION'],
      required: true,
      index: true,
    },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 30 },
    companyName: { type: String, trim: true, maxlength: 255 },
    email: { type: String, trim: true, maxlength: 255 },
    location: { type: String, trim: true, maxlength: 300 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    adminNote: { type: String, trim: true, maxlength: 1500 },
  },
  { timestamps: true }
);

OnboardingRequestSchema.index({ professional: 1, createdAt: -1 });
OnboardingRequestSchema.index({ status: 1, createdAt: -1 });
OnboardingRequestSchema.index({ phoneNumber: 1 });

export const OnboardingRequest =
  (mongoose.models.OnboardingRequest ||
    mongoose.model<IOnboardingRequest>('OnboardingRequest', OnboardingRequestSchema)) as mongoose.Model<IOnboardingRequest>;
