import mongoose, { Schema, type Types } from 'mongoose';

export type FormationQuestionType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';

export interface IFormationFormQuestion {
  id: string;
  label: string;
  type: FormationQuestionType;
  required: boolean;
  options?: string[];
}

export interface IFormation {
  specialistId: Types.ObjectId;
  title: string;
  description?: string;
  imageUrl?: string;
  formationDate: Date;
  location?: string;
  organizer: string;
  allowParticipation: boolean;
  participationFormEnabled: boolean;
  participationFormQuestions: IFormationFormQuestion[];
  stats: {
    participants: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormationFormQuestionSchema = new Schema<IFormationFormQuestion>(
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

const FormationSchema = new Schema<IFormation>(
  {
    specialistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 3000 },
    imageUrl: String,
    formationDate: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200 },
    organizer: { type: String, required: true, trim: true, maxlength: 200 },
    allowParticipation: { type: Boolean, default: true },
    participationFormEnabled: { type: Boolean, default: false },
    participationFormQuestions: { type: [FormationFormQuestionSchema], default: [] },
    stats: {
      participants: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FormationSchema.index({ specialistId: 1, createdAt: -1 });
FormationSchema.index({ isActive: 1, formationDate: 1 });

export const Formation =
  (mongoose.models.Formation || mongoose.model<IFormation>('Formation', FormationSchema)) as mongoose.Model<IFormation>;
