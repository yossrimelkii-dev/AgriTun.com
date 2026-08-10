import mongoose, { Schema, type Types } from 'mongoose';

export interface IAncestor {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

export interface ICategory {
  parentId: Types.ObjectId | null;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  sector: 'MEDICAL' | 'AGRICULTURAL' | 'BOTH';
  sortOrder: number;
  isActive: boolean;
  ancestors: IAncestor[];
  depth: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    icon: String,
    image: String,
    sector: {
      type: String,
      enum: ['MEDICAL', 'AGRICULTURAL', 'BOTH'],
      default: 'BOTH',
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    ancestors: [
      {
        _id: Schema.Types.ObjectId,
        name: String,
        slug: String,
      },
    ],
    depth: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ parentId: 1, isActive: 1, sortOrder: 1 });
CategorySchema.index({ sector: 1 });

export const Category =
  (mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema)) as mongoose.Model<ICategory>;
