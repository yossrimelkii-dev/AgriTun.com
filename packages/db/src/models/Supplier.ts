import mongoose, { Schema, type Types } from 'mongoose';

export interface IAddress {
  label?: string;
  addressLine?: string;
  city?: string;
  wilaya?: string;
  country: string;
  postalCode?: string;
  isHeadquarters: boolean;
}

export interface ICertification {
  name: string;
  issuer?: string;
  year?: number;
  documentUrl?: string;
}

export interface ISupplier {
  userId: Types.ObjectId;
  slug: string;
  companyName: string;
  logo?: string;
  banner?: string;
  description?: string;
  sector: 'MEDICAL' | 'AGRICULTURAL' | 'BOTH';
  isVerified: boolean;

  subscription: {
    planId?: Types.ObjectId;
    planName?: string;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    maxProducts?: number;
    featuredSlots?: number;
    analyticsAccess?: boolean;
  };

  addresses: IAddress[];
  certifications: ICertification[];
  socialLinks: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    phone?: string;
    whatsapp?: string;
  };

  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    profileViews: number;
    averageRating: number;
    totalReviews: number;
    responseRate: number;
  };

  settings: {
    showPhonePublicly: boolean;
    autoConfirmOrders: boolean;
    notifyNewOrder: boolean;
    notifyLowStock: boolean;
    superGrossViewList?: Types.ObjectId[];
    location?: {
      lat: number;
      lng: number;
      updatedAt?: Date;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    companyName: { type: String, required: true },
    logo: String,
    banner: String,
    description: String,
    sector: {
      type: String,
      enum: ['MEDICAL', 'AGRICULTURAL', 'BOTH'],
      required: true,
    },
    isVerified: { type: Boolean, default: false },

    subscription: {
      planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
      planName: String,
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: false },
      maxProducts: Number,
      featuredSlots: Number,
      analyticsAccess: Boolean,
    },

    addresses: [
      {
        label: String,
        addressLine: String,
        city: String,
        wilaya: String,
        country: { type: String, default: 'TN' },
        postalCode: String,
        isHeadquarters: { type: Boolean, default: false },
      },
    ],

    certifications: [
      {
        name: String,
        issuer: String,
        year: Number,
        documentUrl: String,
      },
    ],

    socialLinks: {
      website: String,
      linkedin: String,
      facebook: String,
      phone: String,
      whatsapp: String,
    },

    stats: {
      totalProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      profileViews: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
    },

    settings: {
      showPhonePublicly: { type: Boolean, default: false },
      autoConfirmOrders: { type: Boolean, default: false },
      notifyNewOrder: { type: Boolean, default: true },
      notifyLowStock: { type: Boolean, default: true },
      location: {
        lat: Number,
        lng: Number,
        updatedAt: Date,
      },
      // List of supplier IDs (usually PRIME suppliers) allowed to see "super gross" prices
      superGrossViewList: [{ type: Schema.Types.ObjectId, ref: 'Supplier' }],
    },
  },
  { timestamps: true }
);

SupplierSchema.index({ sector: 1, isVerified: 1 });
SupplierSchema.index({ 'subscription.isActive': 1 });
SupplierSchema.index({ 'stats.averageRating': -1 });

export const Supplier =
  (mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema)) as mongoose.Model<ISupplier>;
