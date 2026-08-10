'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useCartStore } from '@/stores/cart';
import { useI18n } from '@/components/providers/locale-provider';

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, getTotal, getItemCount } = useCartStore();
  const { t, locale } = useI18n();
  
  const getLocaleFormat = (locale: string) => {
    if (locale === 'fr') return 'fr-TN';
    if (locale === 'en') return 'en-US';
    return 'ar-TN';
  };
  
  const formatPrice = (price: number) =>
    new Intl.NumberFormat(getLocaleFormat(locale), { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center min-h-screen">
          <h1 className="text-3xl font-bold mb-4">{t('cart.emptyCart')}</h1>
          <p className="text-muted-foreground mb-8">{t('cart.emptyMessage')}</p>
          <Link href="/">
            <Button size="lg">{t('cart.continueShoppingButton')}</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const total = getTotal();
  const tva = Math.round(total * 0.19);
  const totalTTC = total + tva;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-8">{t('cart.cartHeading')} ({getItemCount()} {getItemCount() > 1 ? t('cart.article') + 's' : t('cart.article')})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.variantId}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-2xl">📦</div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.productName}</h3>
                      <p className="text-sm text-muted-foreground">{item.variantName} — SKU: {item.sku}</p>
                      <p className="text-xs text-muted-foreground">{t('cart.supplier')} {item.supplierId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded">
                        <button
                          className="px-2 py-1 hover:bg-muted"
                          onClick={() => updateQty(item.variantId, Math.max(1, item.qty - 1))}
                        >−</button>
                        <span className="px-3 py-1 text-sm font-medium">{item.qty}</span>
                        <button
                          className="px-2 py-1 hover:bg-muted"
                          onClick={() => updateQty(item.variantId, item.qty + 1)}
                        >+</button>
                      </div>
                      <p className="font-bold w-28 text-right">{formatPrice(item.unitPrice * item.qty)}</p>
                      <button
                        className="text-red-500 hover:text-red-700 ml-2"
                        onClick={() => removeItem(item.variantId)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-between">
              <Link href="/">
                <Button variant="outline">← {t('cart.continueShoppingButton')}</Button>
              </Link>
              <Button variant="outline" className="text-red-600" onClick={() => clearCart()}>
                {t('cart.clearCart')}
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{t('cart.summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.tax')}</span>
                    <span>{formatPrice(tva)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.shipping')}</span>
                    <span className="text-green-600 font-medium">{t('cart.shippingFree')}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>{t('cart.totalTTC')}</span>
                    <span className="text-primary">{formatPrice(totalTTC)}</span>
                  </div>
                </div>
                <Link href="/cart/checkout" className="block">
                  <Button className="w-full" size="lg">
                    {t('cart.checkout')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
