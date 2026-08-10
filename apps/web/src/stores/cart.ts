import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId: string;
  supplierId: string;
  productName: string;
  variantName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }));
      },

      updateQty: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, qty } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'tunagri-cart' }
  )
);
