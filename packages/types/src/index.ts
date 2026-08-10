import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  role: 'BUYER' | 'SUPPLIER' | 'SUPPLIER_PRIME' | 'SUPER_SUPPLIER' | 'AGRI_ENGINEER' | 'TRAINING_CENTER' | 'ADMIN';
  badgeType: 'FREE' | 'PRIME';
  badgeActive: boolean;
  supplierId?: string;
}

// ─── Enums ─────────────────────────────────────────────────────
export const ROLES = ['GUEST', 'BUYER', 'SUPPLIER', 'SUPPLIER_PRIME', 'SUPER_SUPPLIER', 'AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const SECTORS = ['MEDICAL', 'AGRICULTURAL', 'BOTH'] as const;
export type Sector = (typeof SECTORS)[number];

export const BADGE_TYPES = ['FREE', 'PRIME'] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
  'DELIVERED', 'CANCELLED', 'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const UNITS = ['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'PALLET'] as const;
export type Unit = (typeof UNITS)[number];

export const PRICE_VISIBILITY = ['PUBLIC', 'PRIME_ONLY', 'HIDDEN'] as const;
export type PriceVisibility = (typeof PRICE_VISIBILITY)[number];

// ─── Zod Schemas (shared validation) ──────────────────────────

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const registerSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    role: z.enum(['BUYER', 'SUPPLIER', 'SUPPLIER_PRIME', 'AGRI_ENGINEER', 'TRAINING_CENTER']).default('BUYER'),
    speciality: z.string().max(160).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'AGRI_ENGINEER' && !data.speciality?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['speciality'],
        message: 'La spécialité est obligatoire pour un ingénieur agronome',
      });
    }
  });

export const createProductSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  categoryId: z.string().min(1),
  sector: z.enum(['MEDICAL', 'AGRICULTURAL', 'BOTH']),
  images: z.array(
    z.object({
      url: z.string().url(),
      alt: z.string().max(200).optional(),
      order: z.number().int().min(0).optional(),
    })
  ).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  priceVisibility: z.enum(['PUBLIC', 'PRIME_ONLY', 'HIDDEN']).default('PRIME_ONLY'),
  variants: z.array(
    z.object({
      name: z.string().min(1).max(100),
      sku: z.string().min(1).max(100),
      stockQty: z.number().int().min(0).default(0),
      unit: z.enum(['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'PALLET']).default('UNIT'),
      pricing: z.object({
        retailPrice: z.number().min(0),
        bulkPrice: z.number().min(0).optional(),
        superGrossPrice: z.number().min(0).optional(),
        minBulkQty: z.number().int().min(1).default(1),
        currency: z.string().default('TND'),
      }),
      weight: z.number().optional(),
      barcode: z.string().max(50).optional(),
    })
  ).min(1),
  attributes: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string().min(1).max(500),
      unit: z.string().max(50).optional(),
    })
  ).min(1, 'La composition du produit est obligatoire'),
  dosage: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string().min(1).max(500),
      unit: z.string().max(50).optional(),
    })
  ).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
    'DELIVERED', 'CANCELLED', 'REFUNDED',
  ]),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(100).optional(),
});

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  addressLine: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  wilaya: z.string().min(1).max(100),
  country: z.string().default('TN'),
  postalCode: z.string().max(10).optional(),
});

export const placeOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1),
      qty: z.number().int().min(1),
    })
  ).min(1),
  shippingAddress: shippingAddressSchema,
  notes: z.string().max(1000).optional(),
});

// ─── Type inference helpers ────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
