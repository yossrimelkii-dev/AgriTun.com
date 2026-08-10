import mongoose, { Schema, type Types } from 'mongoose';

export type FormationParticipationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface IFormationParticipationAnswer {
  questionId: string;
  label: string;
  value: string;
}

export interface IFormationParticipation {
  formationId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: IFormationParticipationAnswer[];
  status: FormationParticipationStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FormationParticipationAnswerSchema = new Schema<IFormationParticipationAnswer>(
  {
    questionId: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    value: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const FormationParticipationSchema = new Schema<IFormationParticipation>(
  {
    formationId: { type: Schema.Types.ObjectId, ref: 'Formation', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [FormationParticipationAnswerSchema], default: [] },
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

FormationParticipationSchema.index({ formationId: 1, userId: 1 }, { unique: true });
FormationParticipationSchema.index({ formationId: 1, createdAt: -1 });

export const FormationParticipation =
  (mongoose.models.FormationParticipation ||
    mongoose.model<IFormationParticipation>('FormationParticipation', FormationParticipationSchema)) as mongoose.Model<IFormationParticipation>;
