import React, { useState, useRef, useEffect } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Loader2, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import AgentChat from '@/components/agents/AgentChat';

export default function MijnBerichten() {
  const { currentCompany, user } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('berichten');
  const bottomRef = useRef(null);

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', companyId, user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId, email: user?.email });
      return profiles[0] || null;
    },
    enabled: !!companyId && !!user?.email
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['my-messages', companyId, myProfile?.id],
    queryFn: () => base44.entities.WhatsAppMessageLog.filter({ companyId, employee_id: myProfile.id }),
    enabled: !!companyId && !!myProfile?.id,
    refetchInterval: 15000,
  });

  const sortedLogs = [...logs].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedLogs.length]);

  const handleSend = async () => {
    if (!message.trim() || !myProfile) return;
    setSending(true);
    await base44.entities.WhatsAppMessageLog.create({
      companyId,
      employee_id: myProfile.id,
      message: message.trim(),
      direction: 'inbound',
      status: 'received',
      sent_by: user?.email,
    });
    queryClient.invalidateQueries(['my-messages']);
    setMessage('');
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar title="Mijn Berichten" subtitle="Communicatie met de planner" />

      {/* Tabs */}
      <div className="border-b px-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('berichten')}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
            style={{
              borderColor: activeTab === 'berichten' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'berichten' ? 'var(--color-accent)' : 'var(--color-text-muted)'
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Berichten van planner
          </button>
          <button
            onClick={() => setActiveTab('assistent')}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
            style={{
              borderColor: activeTab === 'assistent' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'assistent' ? 'var(--color-accent)' : 'var(--color-text-muted)'
            }}
          >
            <Bot className="w-4 h-4" />
            Planning Assistent
          </button>
        </div>
      </div>

      {activeTab === 'assistent' ? (
        <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
          <AgentChat agentName="planning_assistent" />
        </div>
      ) : (

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4" style={{ height: 'calc(100vh - 120px)' }}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageCircle className="w-12 h-12 mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Geen berichten</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Berichten van je planner verschijnen hier. Je kunt ook zelf een bericht sturen.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {sortedLogs.map((log, i) => {
              const isMe = log.direction === 'inbound';
              return (
                <div key={i} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs text-white" style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}>
                        P
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm"
                      style={isMe
                        ? { background: 'linear-gradient(135deg, #38bdf8, #60a5fa)', color: 'white', borderBottomRightRadius: '4px' }
                        : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderBottomLeftRadius: '4px' }
                      }
                    >
                      {log.message}
                    </div>
                    <span className="text-[10px] px-1" style={{ color: 'var(--color-text-muted)' }}>
                      {format(new Date(log.created_date), 'HH:mm', { locale: nl })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Input
            placeholder="Stuur een bericht naar de planner..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            style={{ background: 'linear-gradient(135deg, #38bdf8, #60a5fa)', color: 'white' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}