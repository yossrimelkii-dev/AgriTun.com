import mongoose, { Schema, type Types } from 'mongoose';

export interface IWishlist {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  addedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  addedAt: { type: Date, default: Date.now },
});

WishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
WishlistSchema.index({ userId: 1, addedAt: -1 });

export const Wishlist =
  (mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', WishlistSchema)) as mongoose.Model<IWishlist>;
