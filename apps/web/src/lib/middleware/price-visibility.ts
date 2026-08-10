import type { JWTPayload } from '@agrimed/types';

/**
 * CRITICAL SECURITY MIDDLEWARE
 * Strips bulk/wholesale pricing from product data for non-PRIME users.
 * Must be applied on EVERY product API endpoint — never rely on frontend to hide this.
 */
export function stripBulkPricing<T extends Record<string, unknown>>(
  product: T & { variants?: Array<Record<string, unknown>> },
  user: JWTPayload | null,
  authorizedForSuperGross?: string[] // array of supplier IDs allowed to see superGrossPrice
): T {
  const isPrimeBuyer = user?.role === 'BUYER' && user?.badgeType === 'PRIME' && user?.badgeActive === true;
  const isSupplier = user?.role === 'SUPPLIER' || user?.role === 'SUPPLIER_PRIME' || user?.role === 'SUPER_SUPPLIER';
  const visibility = (product as { priceVisibility?: string }).priceVisibility || 'PUBLIC';

  const shouldExposeBulkPricing =
    visibility !== 'HIDDEN' && (isSupplier || isPrimeBuyer);

  const canSeeSuperGross = Boolean(isSupplier && user?.supplierId && authorizedForSuperGross?.includes(user.supplierId));

  if (product.variants) {
    return {
      ...product,
      variants: product.variants.map((v) => {
        const pricing = v.pricing as Record<string, unknown> | undefined;
        if (!pricing) return v;

        if (shouldExposeBulkPricing) {
          return {
            ...v,
            pricing: {
              ...pricing,
              primeRequired: false,
              // superGrossPrice is only exposed to suppliers explicitly listed by the product owner
              superGrossPrice: canSeeSuperGross ? (pricing as any).superGrossPrice : undefined,
            },
          };
        }

        return {
          ...v,
          pricing: pricing
            ? {
                retailPrice: pricing.retailPrice,
                currency: pricing.currency,
                // STRIPPED — never sent over the wire to non-PRIME users
                bulkPrice: undefined,
                minBulkQty: undefined,
                superGrossPrice: undefined,
                ...(visibility === 'PRIME_ONLY' ? { primeRequired: true } : {}), // show lock UI only for PRIME-only products
              }
            : v.pricing,
        };
      }),
    };
  }

  return product;
}

/**
 * Strip bulk pricing from an array of products.
 */
export function stripBulkPricingList<T extends Record<string, unknown>>(
  products: Array<T & { variants?: Array<Record<string, unknown>> }>,
  user: JWTPayload | null
): T[] {
  return products.map((p) => stripBulkPricing(p, user));
}
