'use client';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { EngineerSidebar } from '@/components/layout/engineer-sidebar';

export default function EngineerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen">
        <EngineerSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
