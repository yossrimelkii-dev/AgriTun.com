"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';
import { Mail, MapPin, Phone } from 'lucide-react';

const contactItems = [
  {
    id: 'phone',
    value: '+216 70 000 000',
    href: 'tel:+21670000000',
    icon: Phone,
  },
  {
    id: 'email',
    value: 'contact@tunagri.tn',
    href: 'mailto:contact@tunagri.tn',
    icon: Mail,
  },
  {
    id: 'address',
    value: 'Tunis, Tunisie',
    href: 'https://maps.google.com/?q=Tunis',
    icon: MapPin,
  },
];

export function ContactUsSection() {
  const { t } = useI18n();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(t('contactSection.defaultSubject'));
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const body = `${t('contactSection.mailBodyName')}: ${fullName}\n${t('contactSection.mailBodyEmail')}: ${email}\n\n${t('contactSection.mailBodyMessage')}:\n${message}`;
    const mailtoUrl = `mailto:contact@tunagri.tn?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    setIsSubmitted(true);
  };

  return (
    <section className="container py-12">
      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('contactSection.label')}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{t('contactSection.title')}</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl">
              {t('contactSection.subtitle')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/register">{t('contactSection.createAccount')}</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailForm(true);
                  setIsSubmitted(false);
                }}
              >
                {t('contactSection.sendEmail')}
              </Button>
            </div>
          </div>

          {showEmailForm ? (
            <div className="rounded-xl border p-4 md:p-5 bg-background">
              <div className="flex items-center justify-between mb-4 gap-3">
                <h3 className="text-sm font-semibold">{t('contactSection.formTitle')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEmailForm(false);
                    setIsSubmitted(false);
                  }}
                >
                  {t('contactSection.backToInfo')}
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">{t('contactSection.fullName')}</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('contactSection.fullNamePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">{t('contactSection.email')}</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contactSection.emailPlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">{t('contactSection.subject')}</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">{t('contactSection.message')}</label>
                  <textarea
                    className="mt-1 min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contactSection.messagePlaceholder')}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  {t('contactSection.submit')}
                </Button>

                {isSubmitted ? (
                  <p className="text-xs text-emerald-700">
                    {t('contactSection.submitted')}
                  </p>
                ) : null}
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              {contactItems.map((item) => {
                const Icon = item.icon;
                const label = item.id === 'phone'
                  ? t('contactSection.phone')
                  : item.id === 'address'
                    ? t('contactSection.address')
                    : t('contactSection.email');
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <a
                          href={item.href}
                          target={item.id === 'address' ? '_blank' : undefined}
                          rel={item.id === 'address' ? 'noreferrer' : undefined}
                          className="text-sm font-medium hover:underline"
                        >
                          {item.value}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
