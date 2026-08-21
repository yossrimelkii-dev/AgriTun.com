'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { EngineerSidebar } from '@/components/layout/engineer-sidebar';

const ALLOWED = new Set(['AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN']);

export default function EngineerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const role = meData?.user?.role as string | undefined;

  useEffect(() => {
    if (meData === undefined) return; // still loading
    if (!role) {
      router.replace('/login');
      return;
    }
    if (!ALLOWED.has(role)) {
      // Suppliers to their own dashboard; anything else home.
      if (role === 'SUPPLIER' || role === 'SUPPLIER_PRIME' || role === 'SUPER_SUPPLIER') {
        router.replace('/dashboard/overview');
      } else {
        router.replace('/');
      }
    }
  }, [meData, role, router]);

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen">
        <EngineerSidebar role={role} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
