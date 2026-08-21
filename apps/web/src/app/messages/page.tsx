'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/providers/locale-provider';

interface RecipientLookup {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to');
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Session — needed to compute the deterministic threadId for the "compose new" flow.
  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const meId: string | undefined = meQuery.data?.user?.id;

  // If ?to=<userId>, look up the recipient for the header + participant object.
  const recipientQuery = useQuery({
    queryKey: ['message-recipient', toUserId],
    enabled: !!toUserId,
    queryFn: async () => {
      const res = await fetch(`/api/users/${toUserId}`);
      if (!res.ok) throw new Error('Recipient not found');
      return res.json() as Promise<{ user: RecipientLookup }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Deterministic thread id for the compose-to flow (matches API-side sort).
  const composeThreadId = useMemo(() => {
    if (!toUserId || !meId) return null;
    const ids = [meId, toUserId].sort();
    return `${ids[0]}_${ids[1]}`;
  }, [toUserId, meId]);

  // When a compose target is provided, auto-select the (existing or empty) thread.
  useEffect(() => {
    if (composeThreadId && !activeThread) {
      setActiveThread(composeThreadId);
    }
  }, [composeThreadId, activeThread]);

  const getDateLocale = (l: string) => {
    if (l === 'fr') return 'fr-FR';
    if (l === 'en') return 'en-GB';
    return 'ar-TN';
  };

  const threadsQuery = useQuery({
    queryKey: ['threads'],
    queryFn: async () => {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', activeThread],
    queryFn: async () => {
      if (!activeThread) return { messages: [] };
      const res = await fetch(`/api/messages?threadId=${activeThread}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!activeThread,
    refetchInterval: activeThread ? 10000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: string; content: string }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, content }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeThread] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });

  const threads = threadsQuery.data?.threads || [];
  const messages = messagesQuery.data?.messages || [];
  let activeThreadData = threads.find((th: any) => th.threadId === activeThread);

  // Synthesize a placeholder thread when composing to a new recipient with no history.
  if (!activeThreadData && composeThreadId && activeThread === composeThreadId && recipientQuery.data?.user) {
    const u = recipientQuery.data.user;
    activeThreadData = {
      threadId: composeThreadId,
      lastMessage: null,
      unreadCount: 0,
      participant: {
        _id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: u.role,
      },
    };
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">{t('accountLayout.messages', 'Messages')}</h1>

        {threadsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : threads.length === 0 && !activeThread && !composeThreadId ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-muted-foreground">{t('accountMessages.empty', 'Aucune conversation pour le moment.')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('accountMessages.contactHint', 'Vos échanges apparaîtront ici.')}
            </p>
          </div>
        ) : (
          <div className="flex gap-4 h-[70vh]">
            {/* Thread list */}
            <div className="w-72 shrink-0 border rounded-lg overflow-y-auto bg-background">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm">
                  {t('accountMessages.conversations', 'Conversations')}
                </h3>
              </div>

              {/* Pin the compose-to target if it isn't already in the thread list. */}
              {composeThreadId &&
                !threads.some((th: any) => th.threadId === composeThreadId) &&
                recipientQuery.data?.user && (
                  <button
                    onClick={() => setActiveThread(composeThreadId)}
                    className={`w-full text-left p-3 border-b hover:bg-muted/50 transition ${
                      activeThread === composeThreadId ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {`${recipientQuery.data.user.firstName || ''} ${recipientQuery.data.user.lastName || ''}`.trim() || 'Nouveau contact'}
                      </p>
                      <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                        Nouveau
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Démarrer la conversation
                    </p>
                  </button>
                )}

              {threads.map((thread: any) => {
                const p = thread.participant;
                const isActive = thread.threadId === activeThread;
                return (
                  <button
                    key={thread.threadId}
                    onClick={() => setActiveThread(thread.threadId)}
                    className={`w-full text-left p-3 border-b hover:bg-muted/50 transition ${
                      isActive ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {p ? `${p.firstName} ${p.lastName}` : 'Utilisateur'}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {thread.lastMessage?.content}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col border rounded-lg bg-background">
              {!activeThread ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  {t('accountMessages.selectConversation', 'Sélectionnez une conversation')}
                </div>
              ) : (
                <>
                  <div className="p-3 border-b">
                    <p className="font-semibold text-sm">
                      {activeThreadData?.participant
                        ? `${activeThreadData.participant.firstName} ${activeThreadData.participant.lastName}`
                        : 'Conversation'}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg: any) => {
                      const isSent = msg.senderId !== activeThreadData?.participant?._id;
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                              isSent ? 'bg-primary text-white' : 'bg-muted'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isSent ? 'text-white/70' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString(getDateLocale(locale), {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    className="p-3 border-t flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newMessage.trim() || !activeThreadData?.participant?._id) return;
                      sendMutation.mutate({
                        recipientId: activeThreadData.participant._id,
                        content: newMessage,
                      });
                    }}
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Votre message..."
                      maxLength={2000}
                    />
                    <Button type="submit" disabled={sendMutation.isPending || !newMessage.trim()}>
                      Envoyer
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
