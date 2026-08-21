import mongoose, { Schema, type Types } from 'mongoose';

export type HeroPromotionKind = 'PRODUCT' | 'EVENT' | 'FORMATION';
export type HeroPromotionRequesterRole =
  | 'SUPPLIER'
  | 'SUPPLIER_PRIME'
  | 'SUPER_SUPPLIER'
  | 'TRAINING_CENTER'
  | 'AGRI_ENGINEER'
  | 'ADMIN';

export interface IHeroPromotionRequest {
  supplierId?: Types.ObjectId;
  requesterUserId?: Types.ObjectId;
  requesterRole?: HeroPromotionRequesterRole;
  subjectRef?: Types.ObjectId;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  ctaLabel: string;
  kind: HeroPromotionKind;
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
    // Legacy: filled by suppliers (still required for supplier-originated requests).
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    // Generic requester — filled for any role (supplier, training center, engineer, admin).
    requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    requesterRole: {
      type: String,
      enum: ['SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'TRAINING_CENTER', 'AGRI_ENGINEER', 'ADMIN'],
    },
    // Optional pointer back to the promoted Event / Formation / Product doc.
    subjectRef: { type: Schema.Types.ObjectId },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    description: { type: String, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true, maxlength: 3000 },
    linkUrl: { type: String, required: true, trim: true, maxlength: 3000 },
    ctaLabel: { type: String, required: true, trim: true, maxlength: 120, default: 'Voir plus' },
    kind: { type: String, enum: ['PRODUCT', 'EVENT', 'FORMATION'], required: true, default: 'PRODUCT' },
    // Composition/dosage are only meaningful for PRODUCT — kept for backwards compat.
    composition: { type: String, trim: true, maxlength: 2000, default: '' },
    dosage: { type: String, trim: true, maxlength: 1000, default: '' },
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
HeroPromotionRequestSchema.index({ requesterUserId: 1, createdAt: -1 });
HeroPromotionRequestSchema.index({ status: 1, createdAt: -1 });

export const HeroPromotionRequest =
  (mongoose.models.HeroPromotionRequest ||
    mongoose.model<IHeroPromotionRequest>('HeroPromotionRequest', HeroPromotionRequestSchema)) as mongoose.Model<IHeroPromotionRequest>;
