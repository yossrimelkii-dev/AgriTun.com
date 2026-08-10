"use client";

import Link from 'next/link';
import { useI18n } from '@/components/providers/locale-provider';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <span className="text-lg font-bold">
            <span className="text-secondary">Tun</span>
            <span className="text-primary">Agri</span>
            
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('footer.description')}
          </p>
        </div>

        {/* Marketplace */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t('footer.marketplace')}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/products?sector=MEDICAL" className="hover:text-foreground">{t('footer.sectorAnimals')}</Link></li>
            <li><Link href="/products?sector=AGRICULTURAL" className="hover:text-foreground">{t('footer.sectorAgriculture')}</Link></li>
            <li><Link href="/suppliers" className="hover:text-foreground">{t('footer.suppliers')}</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">{t('footer.prime')}</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t('footer.support')}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/help" className="hover:text-foreground">{t('footer.help')}</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">{t('footer.contact')}</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">{t('footer.terms')}</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">{t('footer.privacy')}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t('footer.contactTitle')}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>contact@tunagri.tn</li>
            <li>+216 55 000 000</li>
            <li>Tunis, Tunisie</li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TunAgri. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
