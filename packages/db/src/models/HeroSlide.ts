import mongoose, { Schema } from 'mongoose';

export interface IHeroSlide {
  title: string;
  description?: string;
  kind: 'PRODUCT' | 'EVENT';
  imageUrl?: string;
  ctaLabel: string;
  linkUrl: string;
  composition?: string;
  dosage?: string;
  isActive: boolean;
  sortOrder: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    title: { type: String, required: true },
    description: String,
    kind: {
      type: String,
      enum: ['PRODUCT', 'EVENT'],
      default: 'PRODUCT',
    },
    imageUrl: String,
    ctaLabel: { type: String, required: true, default: 'Voir plus' },
    linkUrl: { type: String, required: true },
    composition: { type: String, trim: true, maxlength: 2000 },
    dosage: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

HeroSlideSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });

export const HeroSlide =
  (mongoose.models.HeroSlide || mongoose.model<IHeroSlide>('HeroSlide', HeroSlideSchema)) as mongoose.Model<IHeroSlide>;