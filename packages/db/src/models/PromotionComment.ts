import mongoose, { Schema, type Types } from 'mongoose';

export interface IPromotionComment {
  slideId: Types.ObjectId;
  userId: Types.ObjectId;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionCommentSchema = new Schema<IPromotionComment>(
  {
    slideId: { type: Schema.Types.ObjectId, ref: 'HeroSlide', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

PromotionCommentSchema.index({ slideId: 1, createdAt: -1 });

export const PromotionComment =
  (mongoose.models.PromotionComment ||
    mongoose.model<IPromotionComment>('PromotionComment', PromotionCommentSchema)) as mongoose.Model<IPromotionComment>;