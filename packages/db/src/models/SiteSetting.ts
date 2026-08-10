import mongoose, { Schema } from 'mongoose';

export interface ISiteSetting {
  key: string;
  onboardingActive: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingSchema = new Schema<ISiteSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    onboardingActive: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SiteSetting =
  (mongoose.models.SiteSetting ||
    mongoose.model<ISiteSetting>('SiteSetting', SiteSettingSchema)) as mongoose.Model<ISiteSetting>;
