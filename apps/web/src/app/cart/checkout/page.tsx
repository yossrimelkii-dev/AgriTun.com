'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { useCartStore } from '@/stores/cart';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Nom complet requis'),
  addressLine: z.string().min(5, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  wilaya: z.string().min(2, 'Gouvernorat requis'),
  postalCode: z.string().optional(),
  country: z.string().default('TN'),
  phone: z.string().min(8, 'Numéro de téléphone requis'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(price);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'TN' },
  });

  const total = getTotal();
  const tva = Math.round(total * 0.19);
  const totalTTC = total + tva;

  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true);
    setError('');
    try {
      // Group items by supplier (B2B: one order per supplier)
      const bySupplier = items.reduce<Record<string, typeof items>>((acc, item) => {
        const sid = item.supplierId;
        if (!acc[sid]) acc[sid] = [];
        acc[sid]!.push(item);
        return acc;
      }, {});

      for (const [supplierId, supplierItems] of Object.entries(bySupplier)) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: supplierItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              qty: item.qty,
            })),
            shippingAddress: data,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erreur lors de la commande');
        }
      }

      clearCart();
      router.push('/cart/success');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-8">Finaliser la commande</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle>Adresse de livraison</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input id="fullName" {...register('fullName')} placeholder="Mohamed Benali" />
                  {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addressLine">Adresse</Label>
                  <Input id="addressLine" {...register('addressLine')} placeholder="123 Rue Didouche Mourad" />
                  {errors.addressLine && <p className="text-sm text-red-500 mt-1">{errors.addressLine.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" {...register('city')} placeholder="Tunis" />
                    {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="wilaya">Gouvernorat</Label>
                    <Input id="wilaya" {...register('wilaya')} placeholder="Tunis" />
                    {errors.wilaya && <p className="text-sm text-red-500 mt-1">{errors.wilaya.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Code Postal</Label>
                    <Input id="postalCode" {...register('postalCode')} placeholder="16000" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" {...register('phone')} placeholder="0555 123 456" />
                    {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Récapitulatif</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.qty}× {item.productName}
                      </span>
                      <span>{formatPrice(item.unitPrice * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA (19%)</span>
                    <span>{formatPrice(tva)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="text-green-600">Gratuite</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total TTC</span>
                    <span className="text-primary">{formatPrice(totalTTC)}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{error}</div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Traitement en cours...' : 'Confirmer la commande'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>
    </>
  );
}
