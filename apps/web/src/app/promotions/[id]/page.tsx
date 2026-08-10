'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { parseKeyValueLines } from '@/lib/key-value-lines';
import { useI18n } from '@/components/providers/locale-provider';

type HeroSlideDetail = {
  _id: string;
  title: string;
  description?: string;
  kind: 'PRODUCT' | 'EVENT';
  imageUrl?: string;
  ctaLabel: string;
  linkUrl: string;
  composition?: string;
  dosage?: string;
  startDate?: string;
  endDate?: string;
};

type PromotionComment = {
  _id: string;
  authorName: string;
  authorId: string;
  authorRole: 'GUEST' | 'BUYER' | 'SUPPLIER' | 'AGRI_ENGINEER' | 'ADMIN';
  authorSpeciality?: string;
  profileUrl?: string;
  isSpecialist?: boolean;
  content: string;
  createdAt: string;
};

export default function PromotionDetailPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [commentText, setCommentText] = useState('');
  const { t, locale } = useI18n();

  const getDateLocale = (lang: string) => {
    if (lang === 'fr') return 'fr-TN';
    if (lang === 'en') return 'en-GB';
    return 'ar-TN';
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hero-slide-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/hero-slides/${id}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || t('promotionDetail.loadPromotionError'));
      return payload;
    },
  });

  const slide: HeroSlideDetail | undefined = data?.slide;

  useEffect(() => {
    if (!slide || slide.kind !== 'EVENT') return;
    if (!slide.linkUrl) return;
    router.replace(slide.linkUrl);
  }, [slide, router]);

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['promotion-comments', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/promotions/${id}/comments`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || t('promotionDetail.loadCommentsError'));
      return payload;
    },
  });

  const comments: PromotionComment[] = commentsData?.comments ?? [];

  const createCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/promotions/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || t('promotionDetail.sendCommentError'));
      return payload;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['promotion-comments', id] });
    },
  });

  const isAuthenticated = Boolean(meData?.user);
  const compositionRows = parseKeyValueLines(slide?.composition);
  const dosageRows = parseKeyValueLines(slide?.dosage);

  function renderTable(rows: { title: string; value: string }[]) {
    if (rows.length === 0) return null;

    return (
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="border-b px-4 py-3 text-left font-semibold">{t('promotionDetail.tableTitle')}</th>
              <th className="border-b px-4 py-3 text-left font-semibold">{t('promotionDetail.tableValue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.title}-${index}`} className="align-top odd:bg-background even:bg-muted/20">
                <td className="border-b px-4 py-3 font-medium text-foreground">{row.title || t('promotionDetail.notAvailable')}</td>
                <td className="border-b px-4 py-3 text-muted-foreground whitespace-pre-wrap">{row.value || t('promotionDetail.notAvailable')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {isLoading ? (
          <section className="container py-12">
            <div className="h-[520px] rounded-3xl bg-muted animate-pulse" />
          </section>
        ) : isError || !slide ? (
          <section className="container py-20 text-center space-y-4">
            <h1 className="text-3xl font-bold">{t('promotionDetail.unavailableTitle')}</h1>
            <p className="text-muted-foreground">{t('promotionDetail.unavailableDescription')}</p>
            <Button asChild>
              <Link href="/">{t('promotionDetail.backHome')}</Link>
            </Button>
          </section>
        ) : (
          <section className="container py-12">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-lg">
              {slide.imageUrl ? (
                <div className="relative aspect-[16/9] w-full bg-muted">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="h-full w-full object-contain bg-white p-4"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-primary/35 via-secondary/25 to-emerald-300/25" />
              )}

              <div className="p-5 pt-4 md:p-8 md:pt-6 space-y-5">
                <div className="space-y-3 max-w-4xl">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {slide.kind === 'PRODUCT' ? t('promotionDetail.kindProductPromotion') : t('promotionDetail.kindEvent')}
                  </span>

                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                    {slide.title}
                  </h1>

                  {slide.description ? (
                    <p className="text-base md:text-lg text-muted-foreground">{slide.description}</p>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button size="lg" asChild>
                      <Link href={slide.linkUrl}>
                        {slide.kind === 'PRODUCT' ? t('promotionDetail.viewProduct') : t('promotionDetail.viewEvent')}
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/products">{t('promotionDetail.viewProducts')}</Link>
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {slide.startDate ? <span>{t('promotionDetail.start')}: {new Date(slide.startDate).toLocaleDateString(getDateLocale(locale))}</span> : null}
                    {slide.endDate ? <span>{t('promotionDetail.end')}: {new Date(slide.endDate).toLocaleDateString(getDateLocale(locale))}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            {slide.kind === 'PRODUCT' && (compositionRows.length > 0 || dosageRows.length > 0) ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-4">
                  <h2 className="text-2xl font-bold">{t('promotionDetail.compositionTableTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('promotionDetail.compositionTableDescription')}</p>
                  {renderTable(compositionRows)}
                </div>

                <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-4">
                  <h2 className="text-2xl font-bold">{t('promotionDetail.dosageTableTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('promotionDetail.dosageTableDescription')}</p>
                  {renderTable(dosageRows)}
                </div>
              </div>
            ) : null}

            <div className="mt-8 rounded-3xl border bg-card p-6 md:p-8">
              <h2 className="text-2xl font-bold">{t('promotionDetail.commentsTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('promotionDetail.commentsSubtitle')}
              </p>

              <div className="mt-5 space-y-3">
                {isAuthenticated ? (
                  <>
                    <textarea
                      className="w-full min-h-[110px] rounded-xl border px-3 py-2 text-sm"
                      placeholder={t('promotionDetail.writeCommentPlaceholder')}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <Button
                      onClick={() => createCommentMutation.mutate()}
                      disabled={createCommentMutation.isPending || !commentText.trim()}
                    >
                      {createCommentMutation.isPending ? t('promotionDetail.sending') : t('promotionDetail.publishComment')}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    {t('promotionDetail.loginToComment')}
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/login">{t('promotionDetail.login')}</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {isLoadingComments ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('promotionDetail.noComments')}</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {comment.profileUrl ? (
                            <Link href={comment.profileUrl} className="font-medium text-sm text-primary hover:underline">
                              {comment.authorName}
                            </Link>
                          ) : (
                            <p className="font-medium text-sm">{comment.authorName}</p>
                          )}
                          {comment.isSpecialist ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {t('promotionDetail.specialist')}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString(getDateLocale(locale))}
                        </p>
                      </div>
                      {comment.isSpecialist && comment.authorSpeciality ? (
                        <p className="mt-1 text-xs text-muted-foreground">{comment.authorSpeciality}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}