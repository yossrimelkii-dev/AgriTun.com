import mongoose, { Schema, type Types } from 'mongoose';

export interface IHeroPromotionRequest {
  supplierId: Types.ObjectId;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  ctaLabel: string;
  kind: 'PRODUCT' | 'EVENT';
  composition: string;
  dosage: string;
  startDate?: Date;
  endDate?: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  processedAt?: Date;
  processedBy?: Types.ObjectId;
  heroSlideId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HeroPromotionRequestSchema = new Schema<IHeroPromotionRequest>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true, maxlength: 3000 },
    linkUrl: { type: String, required: true, trim: true, maxlength: 3000 },
    ctaLabel: { type: String, required: true, trim: true, maxlength: 120, default: 'Voir plus' },
    kind: { type: String, enum: ['PRODUCT', 'EVENT'], required: true, default: 'PRODUCT' },
    composition: { type: String, required: true, trim: true, maxlength: 2000 },
    dosage: { type: String, required: true, trim: true, maxlength: 1000 },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 1500 },
    processedAt: Date,
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    heroSlideId: { type: Schema.Types.ObjectId, ref: 'HeroSlide' },
  },
  { timestamps: true }
);

HeroPromotionRequestSchema.index({ supplierId: 1, createdAt: -1 });
HeroPromotionRequestSchema.index({ status: 1, createdAt: -1 });

export const HeroPromotionRequest =
  (mongoose.models.HeroPromotionRequest ||
    mongoose.model<IHeroPromotionRequest>('HeroPromotionRequest', HeroPromotionRequestSchema)) as mongoose.Model<IHeroPromotionRequest>;
