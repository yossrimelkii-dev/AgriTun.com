'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send } from 'lucide-react';
import { useI18n } from '@/components/providers/locale-provider';

type HelpRequest = {
  _id: string;
  title: string;
  description: string;
  speciality: string;
  engineerId?: string;
  imageUrls: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  engineerRecommendation?: string;
  peasantResult?: string;
  feedback?: { stars?: number; comment?: string; createdAt?: string };
  discussion?: Array<{ senderId: string; message: string; createdAt: string }>;
  createdAt: string;
};

type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  speciality: string;
  bio: string;
  workSummary: string;
  stats: { totalHandled: number; averageRating: number };
};

export default function AccountAgriHelpPage() {
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFromUrlRef = useRef<string | null>(null);
  const [title, setTitle] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [description, setDescription] = useState('');
  const [directImageUrl, setDirectImageUrl] = useState('');
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [resultText, setResultText] = useState<Record<string, string>>({});
  const [messageText, setMessageText] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [feedbackComment, setFeedbackComment] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRequestId, setActiveRequestId] = useState('');
  const [isComposingNewRequest, setIsComposingNewRequest] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: specialistsData } = useQuery({
    queryKey: ['specialists'],
    queryFn: async () => {
      const res = await fetch('/api/specialists');
      return res.json();
    },
  });

  const { data } = useQuery({
    queryKey: ['agri-help-my-requests'],
    queryFn: async () => {
      const res = await fetch('/api/agri-help-requests');
      return res.json();
    },
  });

  const requests: HelpRequest[] = data?.requests ?? [];
  const specialists: Specialist[] = specialistsData?.specialists ?? [];
  const currentUserId = meData?.user?.id ?? '';

  const selectedSpecialist = useMemo(
    () => specialists.find((specialist) => specialist.id === selectedEngineerId),
    [selectedEngineerId, specialists]
  );

  const selectedRequest = useMemo(
    () => requests.find((request) => request._id === activeRequestId) ?? requests[0],
    [requests, activeRequestId]
  );

  const specialistHistory = useMemo(() => {
    if (!selectedEngineerId) return [];
    return requests
      .filter((request) => request.engineerId === selectedEngineerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, selectedEngineerId]);

  const latestFeedbackWithSelectedSpecialist = useMemo(
    () =>
      specialistHistory.find(
        (request) =>
          Boolean(
            request.feedback?.createdAt ||
              typeof request.feedback?.stars === 'number' ||
              (request.feedback?.comment ?? '').trim().length > 0
          )
      ),
    [specialistHistory]
  );

  const selectedRequestHasFeedback = Boolean(
    selectedRequest &&
      (
        selectedRequest.feedback?.createdAt ||
        typeof selectedRequest.feedback?.stars === 'number' ||
        (selectedRequest.feedback?.comment ?? '').trim().length > 0
      )
  );

  const canSubmitFeedback = Boolean(
    selectedRequest &&
      !selectedRequestHasFeedback &&
      (selectedRequest.status === 'IN_PROGRESS' || selectedRequest.status === 'RESOLVED')
  );

  useEffect(() => {
    if (!activeRequestId && requests.length > 0) {
      setActiveRequestId(requests[0]._id);
    }
  }, [requests, activeRequestId]);

  useEffect(() => {
    const engineerIdFromUrl = searchParams.get('engineerId');
    if (engineerIdFromUrl && selectedFromUrlRef.current !== engineerIdFromUrl) {
      setSelectedEngineerId(engineerIdFromUrl);
      selectedFromUrlRef.current = engineerIdFromUrl;

      const history = requests
        .filter((request) => request.engineerId === engineerIdFromUrl)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (history.length > 0) {
        setActiveRequestId(history[0]._id);
        setIsComposingNewRequest(false);
      } else {
        setActiveRequestId('');
        setIsComposingNewRequest(true);
      }
    }
  }, [searchParams, requests]);

  const sortedSpecialists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...specialists]
      .filter((specialist) => {
        if (!term) return true;
        return [
          `${specialist.firstName} ${specialist.lastName}`,
          specialist.speciality,
          specialist.bio,
          specialist.workSummary,
        ].some((value) => value.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        if (b.stats.averageRating !== a.stats.averageRating) return b.stats.averageRating - a.stats.averageRating;
        if (b.stats.totalHandled !== a.stats.totalHandled) return b.stats.totalHandled - a.stats.totalHandled;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });
  }, [searchTerm, specialists]);

  const visibleRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((request) => {
      const specialist = specialists.find((s) => s.id === request.engineerId);
      return [
        request.title,
        request.description,
        request.speciality,
        specialist ? `${specialist.firstName} ${specialist.lastName}` : '',
        specialist?.speciality ?? '',
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [requests, searchTerm, specialists]);

  async function uploadImage(file: File) {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/agri-help-image', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || 'Échec upload image');
      }

      setUploadedImageUrls((urls) => [...urls, result.url]);
    } catch (error: any) {
      alert(error?.message || 'Erreur lors de l\'upload image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function addDirectImageUrl() {
    const value = directImageUrl.trim();
    if (!value) return;
    setUploadedImageUrls((urls) => [...urls, value]);
    setDirectImageUrl('');
  }

  function removeUploadedImage(idx: number) {
    setUploadedImageUrls((urls) => urls.filter((_, i) => i !== idx));
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title || t('accountAgriHelp.defaultRequestTitle'),
        speciality: selectedSpecialist?.speciality || speciality || t('accountAgriHelp.defaultRequestSpeciality'),
        description: description || messageText.newMessage || t('accountAgriHelp.defaultRequestDescription'),
        engineerId: selectedEngineerId || undefined,
        initialMessage: messageText.newMessage || description || '',
        imageUrls: uploadedImageUrls,
      };

      const res = await fetch('/api/agri-help-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Erreur de création');
      return body;
    },
    onSuccess: (result) => {
      setTitle('');
      setSpeciality('');
      setDescription('');
      setDirectImageUrl('');
      setUploadedImageUrls([]);
      setMessageText((prev) => ({ ...prev, newMessage: '' }));
      if (result?.request?._id) {
        setActiveRequestId(result.request._id);
      }
      setIsComposingNewRequest(false);
      qc.invalidateQueries({ queryKey: ['agri-help-my-requests'] });
    },
  });

  function handleSelectSpecialist(specialistId: string) {
    setSelectedEngineerId(specialistId);
    const history = requests
      .filter((request) => request.engineerId === specialistId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (history.length > 0) {
      setActiveRequestId(history[0]._id);
      setIsComposingNewRequest(false);
      return;
    }

    setActiveRequestId('');
    setIsComposingNewRequest(true);
  }

  const submitResultMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/agri-help-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_result',
          peasantResult: resultText[requestId] ?? '',
          stars: stars[requestId] ?? 5,
          comment: feedbackComment[requestId] ?? '',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Erreur de soumission');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agri-help-my-requests'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/agri-help-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          message: messageText[requestId] ?? '',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Erreur de message');
      return body;
    },
    onSuccess: (_, requestId) => {
      setMessageText((prev) => ({ ...prev, [requestId]: '' }));
      qc.invalidateQueries({ queryKey: ['agri-help-my-requests'] });
    },
  });

  return (
    <main className="container py-4 min-h-screen">
      <section className="mt-2 grid gap-6 lg:grid-cols-[320px_1fr] min-h-[1000px]">
        <Card className="h-full">
          <CardHeader className="space-y-3 border-b">
            <CardTitle>{t('accountAgriHelp.messaging')}</CardTitle>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('accountAgriHelp.searchPlaceholder')}
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('accountAgriHelp.conversations')}</p>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {visibleRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-2">{t('accountAgriHelp.noConversation')}</p>
                ) : (
                  visibleRequests.map((request) => {
                    const specialist = specialists.find((s) => s.id === request.engineerId);
                    const isActive = selectedRequest?._id === request._id;
                    const preview = request.discussion?.[request.discussion.length - 1]?.message || request.description;
                    return (
                      <button
                        key={request._id}
                        type="button"
                        onClick={() => {
                          setSelectedEngineerId(request.engineerId || '');
                          setActiveRequestId(request._id);
                          setIsComposingNewRequest(false);
                        }}
                        className={`w-full text-left rounded-2xl border p-3 transition-all ${isActive ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'hover:border-emerald-300 hover:bg-muted/40'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{request.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {specialist ? `${specialist.firstName} ${specialist.lastName}` : request.speciality}
                            </p>
                          </div>
                          <span className="text-[10px] rounded-full border px-2 py-0.5">{request.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preview}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('accountAgriHelp.specialists')}</p>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {sortedSpecialists.map((specialist) => {
                  const isSelected = selectedEngineerId === specialist.id;
                  return (
                    <button
                      key={specialist.id}
                      type="button"
                      onClick={() => handleSelectSpecialist(specialist.id)}
                      className={`w-full text-left rounded-2xl border p-3 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'hover:border-emerald-300 hover:bg-background'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{specialist.firstName} {specialist.lastName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{specialist.speciality || 'Spécialiste agronome'}</p>
                        </div>
                        <span className="text-[10px] rounded-full border px-2 py-0.5">{specialist.stats.averageRating.toFixed(1)} ⭐</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {specialist.stats.totalHandled} {t('accountAgriHelp.requests')} • {specialist.stats.averageRating.toFixed(1)} {t('accountAgriHelp.averageRating')}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedSpecialist ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => {
                    setIsComposingNewRequest(true);
                    setActiveRequestId('');
                    setMessageText((prev) => ({ ...prev, newMessage: '' }));
                  }}
                >
                  {t('accountAgriHelp.newRequest')} {selectedSpecialist.firstName}
                </Button>
              ) : null}

              {selectedSpecialist && specialistHistory.length > 0 ? (
                <div className="mt-4 rounded-2xl border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    {t('accountAgriHelp.history')} {selectedSpecialist.firstName}
                  </p>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {specialistHistory.map((historyItem) => {
                      const lastMessage = historyItem.discussion?.[historyItem.discussion.length - 1]?.message || historyItem.description;
                      const hasFeedback = Boolean(
                        historyItem.feedback?.createdAt ||
                          typeof historyItem.feedback?.stars === 'number' ||
                          (historyItem.feedback?.comment ?? '').trim().length > 0
                      );

                      return (
                        <button
                          key={historyItem._id}
                          type="button"
                          onClick={() => {
                            setActiveRequestId(historyItem._id);
                            setIsComposingNewRequest(false);
                          }}
                          className={`w-full text-left rounded-xl border p-2.5 transition-all ${activeRequestId === historyItem._id ? 'border-emerald-500 bg-emerald-50' : 'hover:border-emerald-300 hover:bg-background'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium truncate">{historyItem.title}</p>
                            <span className="text-[10px] rounded-full border px-2 py-0.5">{historyItem.status}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{lastMessage}</p>
                          {hasFeedback ? (
                            <p className="mt-1 text-[11px] text-emerald-700">
                              Feedback: {historyItem.feedback?.stars ?? '—'} / 5
                              {historyItem.feedback?.comment ? ` — ${historyItem.feedback.comment}` : ''}
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px] text-muted-foreground">{t('accountAgriHelp.noFeedback')}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          {isComposingNewRequest && selectedSpecialist ? (
            <>
              <CardHeader className="border-b space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{t('accountAgriHelp.newRequestTitle')}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedSpecialist.firstName} {selectedSpecialist.lastName} • {selectedSpecialist.speciality || t('accountAgriHelp.defaultRequestSpeciality')}
                    </p>
                  </div>
                  <span className="text-xs rounded-full border px-2 py-0.5">{t('accountAgriHelp.newBadge')}</span>
                </div>

                {latestFeedbackWithSelectedSpecialist ? (
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
                    <p className="font-medium">Dernier feedback avec ce spécialiste</p>
                    <p className="text-muted-foreground mt-1">
                      {latestFeedbackWithSelectedSpecialist.feedback?.stars ?? '—'} / 5
                      {latestFeedbackWithSelectedSpecialist.feedback?.comment
                        ? ` — ${latestFeedbackWithSelectedSpecialist.feedback.comment}`
                        : ''}
                    </p>
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-4 gap-4">
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  {t('accountAgriHelp.newRequestInfo')}
                </div>

                <textarea
                  className="w-full rounded-2xl border px-3 py-3 text-sm min-h-[140px]"
                  placeholder={t('accountAgriHelp.newRequestPlaceholder').replace('{name}', selectedSpecialist.firstName)}
                  value={messageText.newMessage ?? ''}
                  onChange={(e) => setMessageText((prev) => ({ ...prev, newMessage: e.target.value }))}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedEngineerId || !messageText.newMessage?.trim()) return;
                      createMutation.mutate();
                    }}
                    disabled={createMutation.isPending || !selectedEngineerId || !(messageText.newMessage ?? '').trim()}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {t('accountAgriHelp.sendNewRequest')}
                  </Button>

                  {specialistHistory.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setActiveRequestId(specialistHistory[0]._id);
                        setIsComposingNewRequest(false);
                      }}
                    >
                      Voir l'historique
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </>
          ) : selectedRequest ? (
            <>
              <CardHeader className="border-b space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{selectedRequest.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedSpecialist ? `${selectedSpecialist.firstName} ${selectedSpecialist.lastName}` : 'Spécialiste'} • {selectedRequest.speciality}
                    </p>
                  </div>
                  <span className="text-xs rounded-full border px-2 py-0.5">{selectedRequest.status}</span>
                </div>
                {selectedRequest.status === 'OPEN' && (selectedRequest.discussion?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    En attente d’acceptation du spécialiste. La discussion reprendra dès qu’il aura accepté.
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-4 gap-4">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {(selectedRequest.discussion?.length ?? 0) === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                      Démarrez la conversation avec votre premier message.
                    </div>
                  ) : (
                    selectedRequest.discussion?.map((message, idx) => {
                      const isMine = message.senderId === currentUserId;
                      return (
                        <div key={`${message.createdAt}-${idx}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isMine ? 'bg-emerald-600 text-white' : 'bg-muted/60 text-foreground'}`}>
                            <p>{message.message}</p>
                            <p className={`mt-1 text-[10px] ${isMine ? 'text-emerald-50/80' : 'text-muted-foreground'}`}>
                              {new Date(message.createdAt).toLocaleString('fr-TN')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedRequest.engineerRecommendation && (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm border border-emerald-100">
                    <p className="font-medium text-emerald-800">Recommandation du spécialiste</p>
                    <p className="text-emerald-900">{selectedRequest.engineerRecommendation}</p>
                  </div>
                )}

                {selectedRequest.status === 'OPEN' && (selectedRequest.discussion?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Le spécialiste doit accepter votre première demande pour continuer la discussion.
                  </div>
                ) : selectedRequest.status === 'RESOLVED' ? (
                  <div className="space-y-2 rounded-2xl border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Résultat</p>
                    <p>{selectedRequest.peasantResult || '—'}</p>
                    <p className="font-medium mt-2">Note</p>
                    <p>{selectedRequest.feedback?.stars ?? '—'} / 5</p>
                    {selectedRequest.feedback?.comment ? <p className="text-muted-foreground">{selectedRequest.feedback.comment}</p> : null}
                  </div>
                ) : null}

                <div className="border-t pt-4 space-y-3">
                  {selectedRequest.status === 'OPEN' && (selectedRequest.discussion?.length ?? 0) === 0 ? (
                    <>
                      <textarea
                        className="w-full rounded-2xl border px-3 py-3 text-sm min-h-[110px]"
                        placeholder={selectedSpecialist ? t('accountAgriHelp.firstMessagePlaceholder').replace('{name}', selectedSpecialist.firstName) : t('accountAgriHelp.firstMessageEmpty')}
                        value={messageText.newMessage ?? ''}
                        onChange={(e) => setMessageText((prev) => ({ ...prev, newMessage: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (!selectedEngineerId || !messageText.newMessage?.trim()) return;
                            createMutation.mutate();
                          }}
                          disabled={createMutation.isPending || !selectedEngineerId || !(messageText.newMessage ?? '').trim()}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Envoyer le premier message
                        </Button>
                      </div>
                    </>
                  ) : selectedRequest.status === 'IN_PROGRESS' ? (
                    <>
                      <textarea
                        className="w-full rounded-2xl border px-3 py-3 text-sm min-h-[96px]"
                        placeholder="Écrivez votre message au spécialiste..."
                        value={messageText[selectedRequest._id] ?? ''}
                        onChange={(e) => setMessageText((prev) => ({ ...prev, [selectedRequest._id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => sendMessageMutation.mutate(selectedRequest._id)}
                          disabled={sendMessageMutation.isPending}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Envoyer
                        </Button>
                      </div>

                      {canSubmitFeedback ? (
                        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                          <p className="text-sm font-medium">Terminer l'aide et laisser votre feedback</p>
                          <textarea
                            className="w-full rounded-2xl border px-3 py-3 text-sm min-h-[90px]"
                            placeholder={t('accountAgriHelp.resultPlaceholder')}
                            value={resultText[selectedRequest._id] ?? ''}
                            onChange={(e) => setResultText((prev) => ({ ...prev, [selectedRequest._id]: e.target.value }))}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select
                              className="rounded-md border px-3 py-2 text-sm"
                              value={stars[selectedRequest._id] ?? 5}
                              onChange={(e) => setStars((prev) => ({ ...prev, [selectedRequest._id]: Number(e.target.value) }))}
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>
                              ))}
                            </select>
                            <input
                              className="rounded-md border px-3 py-2 text-sm"
                              placeholder="Commentaire feedback"
                              value={feedbackComment[selectedRequest._id] ?? ''}
                              onChange={(e) => setFeedbackComment((prev) => ({ ...prev, [selectedRequest._id]: e.target.value }))}
                            />
                          </div>
                          <Button
                            onClick={() => submitResultMutation.mutate(selectedRequest._id)}
                            disabled={
                              submitResultMutation.isPending ||
                              !(resultText[selectedRequest._id] ?? '').trim()
                            }
                            className="w-full"
                          >
                            Terminer la demande & envoyer le feedback
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : selectedRequest.status === 'RESOLVED' ? (
                    selectedRequestHasFeedback ? (
                      <div className="rounded-2xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        Feedback déjà envoyé pour cette demande. Merci 🙌
                      </div>
                    ) : canSubmitFeedback ? (
                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <p className="text-sm font-medium">Finaliser et envoyer le feedback</p>
                        <textarea
                          className="w-full rounded-2xl border px-3 py-3 text-sm min-h-[90px]"
                          placeholder={t('accountAgriHelp.resultPlaceholder')}
                          value={resultText[selectedRequest._id] ?? ''}
                          onChange={(e) => setResultText((prev) => ({ ...prev, [selectedRequest._id]: e.target.value }))}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            className="rounded-md border px-3 py-2 text-sm"
                            value={stars[selectedRequest._id] ?? 5}
                            onChange={(e) => setStars((prev) => ({ ...prev, [selectedRequest._id]: Number(e.target.value) }))}
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                          <input
                            className="rounded-md border px-3 py-2 text-sm"
                            placeholder="Commentaire feedback"
                            value={feedbackComment[selectedRequest._id] ?? ''}
                            onChange={(e) => setFeedbackComment((prev) => ({ ...prev, [selectedRequest._id]: e.target.value }))}
                          />
                        </div>
                        <Button
                          onClick={() => submitResultMutation.mutate(selectedRequest._id)}
                          disabled={
                            submitResultMutation.isPending ||
                            !(resultText[selectedRequest._id] ?? '').trim()
                          }
                          className="w-full"
                        >
                          Envoyer le feedback
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Demande clôturée.
                      </div>
                    )
                  ) : (
                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                      La discussion a été clôturée.
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted-foreground">
              {t('accountAgriHelp.selectSpecialistInstruction')}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
