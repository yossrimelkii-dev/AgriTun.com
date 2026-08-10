'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/locale-provider';

export default function AccountMessagesPage() {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const getDateLocale = (locale: string) => {
    if (locale === 'fr') return 'fr-FR';
    if (locale === 'en') return 'en-GB';
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

  const activeThreadData = threads.find((t: any) => t.threadId === activeThread);

  if (threadsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (threads.length === 0 && !activeThread) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">💬</p>
        <p className="text-muted-foreground">{t('accountMessages.empty')}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('accountMessages.contactHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Thread list */}
      <div className="w-72 shrink-0 border rounded-lg overflow-y-auto">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">{t('accountMessages.conversations')}</h3>
        </div>
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
      <div className="flex-1 flex flex-col border rounded-lg">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t('accountMessages.selectConversation')}
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
                        isSent
                          ? 'bg-primary text-white'
                          : 'bg-muted'
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
  );
}
