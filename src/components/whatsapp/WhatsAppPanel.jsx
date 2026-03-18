import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, MessageCircle, Sparkles, Search, ChevronLeft, Loader2, Bot
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import TemplateSelector from './TemplateSelector';

const getInitials = (first, last) => `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();

function ConversationList({ employees, logs, onSelect, onAI }) {
  const [search, setSearch] = useState('');

  const filtered = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const getLastMessage = (employeeId) => {
    const empLogs = logs.filter(l => l.employee_id === employeeId);
    return empLogs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  };

  const getUnread = (employeeId) => {
    return logs.filter(l => l.employee_id === employeeId && l.direction === 'inbound' && !l.read).length;
  };

  return (
    <div className="flex flex-col h-full">
      {/* AI Button */}
      <button
        onClick={onAI}
        className="flex items-center gap-3 px-4 py-3 transition-colors border-b"
        style={{ backgroundColor: 'rgba(56,189,248,0.08)', borderColor: 'var(--color-border)' }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}>
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Assistent</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Vraag de AI een bericht te sturen</p>
        </div>
        <Sparkles className="w-4 h-4" style={{ color: '#38bdf8' }} />
      </button>

      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
          <Input
            placeholder="Zoek medewerker..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-xs py-8" style={{ color: 'var(--color-text-muted)' }}>Geen medewerkers gevonden</p>
        ) : (
          filtered.map(emp => {
            const last = getLastMessage(emp.id);
            const unread = getUnread(emp.id);
            return (
              <button
                key={emp.id}
                onClick={() => onSelect(emp)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--color-border)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-light)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs text-white" style={{ background: 'linear-gradient(135deg, #38bdf8, #94a3b8)' }}>
                      {getInitials(emp.first_name, emp.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  {emp.whatsapp_opt_in && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2" style={{ borderColor: 'var(--color-surface)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {emp.first_name} {emp.last_name}
                    </p>
                    {last && (
                      <span className="text-xs ml-1 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        {format(new Date(last.created_date), 'd MMM', { locale: nl })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {last ? last.message : (emp.whatsapp_opt_in ? 'Verbonden' : 'Nog niet verbonden')}
                  </p>
                </div>
                {unread > 0 && (
                  <Badge className="text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full" style={{ backgroundColor: '#22c55e', padding: '0 6px' }}>
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChatView({ employee, logs, onBack, onSend, onSendTemplate, sending }) {
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);

  const empLogs = logs
    .filter(l => l.employee_id === employee.id)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [empLogs.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(employee, message);
    setMessage('');
  };

  const handleTemplateSend = (templateMessage) => {
    onSendTemplate(employee, templateMessage);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs text-white" style={{ background: 'linear-gradient(135deg, #38bdf8, #94a3b8)' }}>
            {getInitials(employee.first_name, employee.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{employee.first_name} {employee.last_name}</p>
          <p className="text-xs" style={{ color: employee.whatsapp_opt_in ? '#22c55e' : 'var(--color-text-muted)' }}>
            {employee.whatsapp_opt_in ? '● Verbonden' : '○ Niet verbonden'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {empLogs.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {employee.whatsapp_opt_in ? 'Stuur het eerste bericht of kies een sjabloon' : 'Medewerker heeft WhatsApp nog niet gekoppeld'}
            </p>
          </div>
        ) : (
          empLogs.map((log, i) => (
            <div key={i} className={`flex ${log.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap"
                style={log.direction === 'outbound'
                  ? { background: 'linear-gradient(135deg, #38bdf8, #60a5fa)', color: 'white' }
                  : { backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-primary)' }
                }
              >
                <p>{log.message}</p>
                <p className="text-[10px] mt-0.5 opacity-70 text-right">
                  {format(new Date(log.created_date), 'HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Template selector */}
      {employee.whatsapp_opt_in && (
        <TemplateSelector
          employeeName={`${employee.first_name} ${employee.last_name}`}
          onSend={handleTemplateSend}
          sending={sending}
        />
      )}

      {/* Free text input */}
      <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <Input
          placeholder={employee.whatsapp_opt_in ? 'Of typ een vrij bericht...' : 'Medewerker niet verbonden'}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={!employee.whatsapp_opt_in || sending}
          className="flex-1 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || !employee.whatsapp_opt_in || sending}
          style={{ background: 'linear-gradient(135deg, #38bdf8, #60a5fa)', color: 'white' }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function AIView({ employees, onBack, onSend, sending }) {
  const [prompt, setPrompt] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const connectedEmployees = employees.filter(e => e.whatsapp_opt_in);

  const handleSend = () => {
    if (!prompt.trim() || selectedEmployees.length === 0) return;
    onSend(selectedEmployees, prompt);
    setPrompt('');
    setSelectedEmployees([]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Assistent</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: 'var(--color-text-secondary)' }}>
          Beschrijf wat je wilt communiceren. De AI schrijft een passend WhatsApp bericht voor de geselecteerde medewerkers.
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Ontvangers ({selectedEmployees.length} geselecteerd)
          </p>
          {connectedEmployees.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Geen verbonden medewerkers</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {connectedEmployees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:opacity-80">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{emp.first_name} {emp.last_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
        <Input
          placeholder="Bijv: herinner aan dienst morgen om 8u..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="text-sm"
        />
        <Button
          className="w-full text-sm"
          onClick={handleSend}
          disabled={!prompt.trim() || selectedEmployees.length === 0 || sending}
          style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', color: 'white' }}
        >
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI bericht versturen
        </Button>
      </div>
    </div>
  );
}

export default function WhatsAppPanel({ onClose }) {
  const { currentCompany, user } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // 'list' | 'chat' | 'ai'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['whatsapp-logs', companyId],
    queryFn: () => base44.entities.WhatsAppMessageLog.filter({ companyId }),
    enabled: !!companyId
  });

  const unreadCount = logs.filter(l => l.direction === 'inbound' && !l.read).length;

  const handleSendDirect = async (employee, message) => {
    setSending(true);
    const payload = {
      phoneNumber: employee.phone,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeId: employee.id,
      companyId,
      periodLabel: 'een bericht van de planner',
      rosterUrl: message,
    };
    await base44.functions.invoke('sendWhatsAppMessage', payload);
    queryClient.invalidateQueries(['whatsapp-logs', companyId]);
    setSending(false);
  };

  const handleSendAI = async (employeeIds, prompt) => {
    setSending(true);
    const targets = employees.filter(e => employeeIds.includes(e.id));
    for (const emp of targets) {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Je bent een planningsassistent. Schrijf een kort, vriendelijk WhatsApp-bericht in het Nederlands voor medewerker ${emp.first_name} ${emp.last_name}. Instructie: ${prompt}. Houd het onder 160 tekens.`,
      });
      const aiMessage = typeof res === 'string' ? res : res?.text || res?.message || JSON.stringify(res);
      await handleSendDirect(emp, aiMessage);
    }
    setSending(false);
    setView('list');
  };

  return (
    <div
      className="fixed right-0 top-16 bottom-0 w-80 flex flex-col shadow-2xl z-40"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>WhatsApp</span>
          {unreadCount > 0 && (
            <Badge className="text-white text-xs h-4 px-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }}>{unreadCount}</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' && (
          <ConversationList
            employees={employees}
            logs={logs}
            onSelect={(emp) => { setSelectedEmployee(emp); setView('chat'); }}
            onAI={() => setView('ai')}
          />
        )}
        {view === 'chat' && selectedEmployee && (
          <ChatView
            employee={selectedEmployee}
            logs={logs}
            onBack={() => setView('list')}
            onSend={handleSendDirect}
            sending={sending}
          />
        )}
        {view === 'ai' && (
          <AIView
            employees={employees}
            onBack={() => setView('list')}
            onSend={handleSendAI}
            sending={sending}
          />
        )}
      </div>
    </div>
  );
}