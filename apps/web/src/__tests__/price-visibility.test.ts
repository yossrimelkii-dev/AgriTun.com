import { describe, it, expect } from 'vitest';
import { stripBulkPricing, stripBulkPricingList } from '../lib/middleware/price-visibility';
import type { JWTPayload } from '@agrimed/types';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Product',
  slug: 'test-product',
  priceVisibility: 'PRIME_ONLY',
  variants: [
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Standard',
      sku: 'TEST-001',
      stockQty: 100,
      pricing: {
        retailPrice: 15000,
        bulkPrice: 11000,
        minBulkQty: 10,
        currency: 'TND',
      },
    },
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Premium',
      sku: 'TEST-002',
      stockQty: 50,
      pricing: {
        retailPrice: 25000,
        bulkPrice: 19000,
        minBulkQty: 5,
        currency: 'TND',
      },
    },
  ],
};

const freeUser: JWTPayload = {
  userId: 'user1',
  role: 'BUYER',
  badgeType: 'FREE',
  badgeActive: false,
};

const supplierUser: JWTPayload = {
  userId: 'supplier0',
  role: 'SUPPLIER',
  badgeType: 'FREE',
  badgeActive: false,
  supplierId: 'supplier-0',
};

const primeUser: JWTPayload = {
  userId: 'user2',
  role: 'BUYER',
  badgeType: 'PRIME',
  badgeActive: true,
};

const supplierAuthorizedForSuperGross: JWTPayload = {
  userId: 'supplier1',
  role: 'SUPPLIER',
  badgeType: 'FREE',
  badgeActive: false,
  supplierId: 'supplier-allowed',
};

const supplierNotAuthorizedForSuperGross: JWTPayload = {
  userId: 'supplier2',
  role: 'SUPPLIER',
  badgeType: 'FREE',
  badgeActive: false,
  supplierId: 'supplier-denied',
};

const expiredPrimeUser: JWTPayload = {
  userId: 'user3',
  role: 'BUYER',
  badgeType: 'PRIME',
  badgeActive: false, // subscription expired
};

describe('Price Visibility Middleware', () => {
  it('strips bulkPrice from product for FREE user', () => {
    const result = stripBulkPricing(structuredClone(mockProduct), freeUser);

    for (const variant of result.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeUndefined();
      expect(pricing.minBulkQty).toBeUndefined();
      expect(pricing.primeRequired).toBe(true);
      expect(pricing.retailPrice).toBeDefined();
    }
  });

  it('strips bulkPrice for guest (null user)', () => {
    const result = stripBulkPricing(structuredClone(mockProduct), null);

    for (const variant of result.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeUndefined();
      expect(pricing.minBulkQty).toBeUndefined();
      expect(pricing.primeRequired).toBe(true);
    }
  });

  it('strips bulkPrice for expired PRIME user', () => {
    const result = stripBulkPricing(structuredClone(mockProduct), expiredPrimeUser);

    for (const variant of result.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeUndefined();
      expect(pricing.minBulkQty).toBeUndefined();
      expect(pricing.primeRequired).toBe(true);
    }
  });

  it('preserves bulkPrice for active PRIME user', () => {
    const result = stripBulkPricing(structuredClone(mockProduct), primeUser);

    for (const variant of result.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeDefined();
      expect(pricing.minBulkQty).toBeDefined();
      expect(pricing.retailPrice).toBeDefined();
      expect(pricing.primeRequired).toBe(false);
    }
  });

  it('exposes superGrossPrice only to suppliers in the authorized list', () => {
    const productWithSuperGross = {
      ...structuredClone(mockProduct),
      variants: mockProduct.variants.map((variant) => ({
        ...variant,
        pricing: {
          ...variant.pricing,
          superGrossPrice: 9000,
        },
      })),
    };

    const authorizedResult = stripBulkPricing(structuredClone(productWithSuperGross), supplierAuthorizedForSuperGross, ['supplier-allowed']);
    const deniedResult = stripBulkPricing(structuredClone(productWithSuperGross), supplierNotAuthorizedForSuperGross, ['supplier-allowed']);

    for (const variant of authorizedResult.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.superGrossPrice).toBe(9000);
    }

    for (const variant of deniedResult.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.superGrossPrice).toBeUndefined();
    }
  });

  it('hides bulkPrice for PUBLIC product from FREE users', () => {
    const publicProduct = { ...structuredClone(mockProduct), priceVisibility: 'PUBLIC' };
    const freeResult = stripBulkPricing(structuredClone(publicProduct), freeUser);

    for (const variant of freeResult.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeUndefined();
      expect(pricing.minBulkQty).toBeUndefined();
      expect(pricing.primeRequired).toBeUndefined();
    }
  });

  it('keeps bulkPrice visible for PUBLIC product for suppliers', () => {
    const publicProduct = { ...structuredClone(mockProduct), priceVisibility: 'PUBLIC' };
    const supplierResult = stripBulkPricing(structuredClone(publicProduct), supplierUser);

    for (const variant of supplierResult.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeDefined();
      expect(pricing.minBulkQty).toBeDefined();
      expect(pricing.primeRequired).toBe(false);
    }
  });

  it('keeps bulkPrice visible for PUBLIC product for active PRIME buyers', () => {
    const publicProduct = { ...structuredClone(mockProduct), priceVisibility: 'PUBLIC' };
    const primeResult = stripBulkPricing(structuredClone(publicProduct), primeUser);

    for (const variant of primeResult.variants!) {
      const pricing = variant.pricing as Record<string, unknown>;
      expect(pricing.bulkPrice).toBeDefined();
      expect(pricing.minBulkQty).toBeDefined();
      expect(pricing.primeRequired).toBe(false);
    }
  });

  it('hides bulkPrice for HIDDEN product from everyone', () => {
    const hiddenProduct = { ...structuredClone(mockProduct), priceVisibility: 'HIDDEN' };

    const freeResult = stripBulkPricing(structuredClone(hiddenProduct), freeUser);
    const primeResult = stripBulkPricing(structuredClone(hiddenProduct), primeUser);

    for (const result of [freeResult, primeResult]) {
      for (const variant of result.variants!) {
        const pricing = variant.pricing as Record<string, unknown>;
        expect(pricing.bulkPrice).toBeUndefined();
        expect(pricing.minBulkQty).toBeUndefined();
        expect(pricing.primeRequired).toBeUndefined();
      }
    }
  });

  it('never leaks bulkPrice in API response for FREE users (bulk list)', () => {
    const products = [structuredClone(mockProduct), structuredClone(mockProduct)];
    const results = stripBulkPricingList(products, freeUser);

    for (const product of results) {
      for (const variant of (product as typeof mockProduct).variants) {
        const pricing = variant.pricing as Record<string, unknown>;
        expect(pricing.bulkPrice).toBeUndefined();
        expect(pricing.minBulkQty).toBeUndefined();
      }
    }
  });

  it('bulkPrice is NEVER present in JSON.stringify output for FREE user', () => {
    const result = stripBulkPricing(structuredClone(mockProduct), freeUser);
    const json = JSON.stringify(result);

    // This is the ultimate test — if "bulkPrice":11000 appears in the JSON, we have a leak
    expect(json).not.toContain('"bulkPrice":11000');
    expect(json).not.toContain('"bulkPrice":19000');
    expect(json).not.toContain('"minBulkQty":10');
    expect(json).not.toContain('"minBulkQty":5');
  });
});
