import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/home/hero-section';
import { FeaturedProducts } from '@/components/home/featured-products';
import { FormationsHorizontalList } from '@/components/home/formations-horizontal-list';
import { EventsHorizontalList } from '@/components/home/events-horizontal-list';
import { CategoryGrid } from '@/components/home/category-grid';
import { CategoryShowcaseSection } from '@/components/home/category-showcase-section';
import { CompanyServicesSection } from '@/components/home/company-services-section';
import { SpecialistsHorizontalList } from '@/components/home/specialists-horizontal-list';
import { SuppliersHorizontalList } from '@/components/home/suppliers-horizontal-list';
import { TrainingCentersHorizontalList } from '@/components/home/training-centers-horizontal-list';
import { AboutUsSection } from '@/components/home/about-us-section';
import { ContactUsSection } from '@/components/home/contact-us-section';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { defaultLocale, isLocale } from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';

export default function HomePage() {
  const cookieLocale = cookies().get('locale')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const home = (messages[locale]?.home as Record<string, string> | undefined) ?? {};

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />

        {/* Category Grid */}
        <section className="container pt-4 pb-12 md:pt-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{home.categoriesTitle ?? 'Catégories'}</h2>
              <p className="text-sm text-muted-foreground mt-1 md:text-base">{home.categoriesSubtitle ?? 'Parcourez nos secteurs médical et agricole'}</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/categories">{home.viewAll ?? 'Voir tout'}</Link>
            </Button>
          </div>
          <CategoryGrid />
        </section>

        {/* Featured Products */}
        <section className="bg-muted/50 py-12">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{home.featuredTitle ?? 'Produits en vedette'}</h2>
                <p className="text-muted-foreground mt-2">{home.featuredSubtitle ?? 'Sélection de produits populaires de fournisseurs vérifiés'}</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/products">{home.viewAll ?? 'Voir tout'}</Link>
              </Button>
            </div>
            <FeaturedProducts />
          </div>
        </section>

        <FormationsHorizontalList />

        <EventsHorizontalList />

        <TrainingCentersHorizontalList />

        <SuppliersHorizontalList />

        <SpecialistsHorizontalList />

        <CategoryShowcaseSection />

        <CompanyServicesSection />

        <AboutUsSection />

        <ContactUsSection />
      </main>
      <Footer />
    </div>
  );
}
