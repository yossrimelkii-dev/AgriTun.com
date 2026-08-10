import mongoose, { Schema } from 'mongoose';

export interface ISubscriptionPlan {
  name: string;
  slug: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: {
    maxProducts: number;
    featuredSlots: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
    bulkOrderAccess: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: {
      monthly: { type: Number, required: true },
      annual: { type: Number, required: true },
    },
    features: {
      maxProducts: { type: Number, required: true },
      featuredSlots: { type: Number, default: 0 },
      analyticsAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      bulkOrderAccess: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SubscriptionPlanSchema.index({ isActive: 1 });

export const SubscriptionPlan =
  (mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema)) as mongoose.Model<ISubscriptionPlan>;
