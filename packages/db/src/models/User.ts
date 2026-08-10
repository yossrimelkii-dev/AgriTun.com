import mongoose, { Schema } from 'mongoose';

export interface IUser {
  email: string;
  passwordHash?: string;
  role: 'GUEST' | 'BUYER' | 'SUPPLIER' | 'SUPPLIER_PRIME' | 'SUPER_SUPPLIER' | 'AGRI_ENGINEER' | 'TRAINING_CENTER' | 'ADMIN';
  badge: {
    type: 'FREE' | 'PRIME';
    isActive: boolean;
    issuedAt?: Date;
    expiresAt?: Date;
  };
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    country?: string;
    city?: string;
    avatarUrl?: string;
    bio?: string;
    speciality?: string;
    workSummary?: string;
    cvUrl?: string;
    location?: {
      lat?: number;
      lng?: number;
      label?: string;
    };
  };
  oauthProviders: Array<{ provider: string; providerId: string }>;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['GUEST', 'BUYER', 'SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN'],
      default: 'BUYER',
    },
    badge: {
      type: {
        type: String,
        enum: ['FREE', 'PRIME'],
        default: 'FREE',
      },
      isActive: { type: Boolean, default: false },
      issuedAt: Date,
      expiresAt: Date,
    },
    profile: {
      firstName: String,
      lastName: String,
      phone: String,
      companyName: String,
      country: String,
      city: String,
      avatarUrl: String,
      bio: String,
      speciality: String,
      workSummary: String,
      cvUrl: String,
      location: {
        lat: Number,
        lng: Number,
        label: String,
      },
    },
    oauthProviders: [
      {
        provider: String,
        providerId: String,
      },
    ],
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ 'badge.type': 1, 'badge.isActive': 1 });

const existingUserModel = mongoose.models.User as mongoose.Model<IUser> | undefined;
const existingRolePath = existingUserModel?.schema?.path('role') as
  | { options?: { enum?: string[] } }
  | undefined;
const existingRoleEnum = existingRolePath?.options?.enum;

if (
  existingUserModel &&
  Array.isArray(existingRoleEnum) &&
  (!existingRoleEnum.includes('AGRI_ENGINEER') || !existingRoleEnum.includes('TRAINING_CENTER'))
) {
  delete mongoose.models.User;
}

export const User = (mongoose.models.User || mongoose.model<IUser>('User', UserSchema)) as mongoose.Model<IUser>;
