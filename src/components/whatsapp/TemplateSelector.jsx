import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Eye, Send, Loader2 } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'rooster_gepubliceerd',
    label: '📋 Rooster gepubliceerd',
    description: 'Nieuw rooster klaarstaat',
    hasCustomMessage: false,
    buildMessage: (name) => `Hoi ${name},\n\nEr is een nieuw rooster gepubliceerd. Bekijk je rooster in de app of vraag de Planning Assistent.`,
  },
  {
    id: 'dienst_herinnering',
    label: '⏰ Dienstherinnering',
    description: 'Herinner aan dienst',
    hasCustomMessage: false,
    buildMessage: (name) => `Hoi ${name},\n\nDit is een herinnering voor je dienst morgen. Controleer je dienst in de app of vraag de Planning Assistent.`,
  },
  {
    id: 'rooster_gewijzigd',
    label: '🔄 Roosterwijziging',
    description: 'Wijziging doorgeven',
    hasCustomMessage: true,
    placeholder: 'Beschrijf de wijziging...',
    buildMessage: (name, custom) => `Hoi ${name},\n\nEr is een wijziging in je rooster.\n\n${custom}`,
  },
  {
    id: 'algemene_melding',
    label: '🔔 Vrij bericht',
    description: 'Eigen bericht typen',
    hasCustomMessage: true,
    placeholder: 'Typ je bericht...',
    buildMessage: (name, custom) => `Hoi ${name},\n\n${custom}`,
  },
];

export default function TemplateSelector({ employeeName, onSend, sending }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const template = TEMPLATES.find(t => t.id === selectedTemplate);

  const handleSelect = (id) => {
    setSelectedTemplate(id);
    setCustomMessage('');
    setShowPreview(false);
  };

  const handleSend = () => {
    if (!template) return;
    if (template.hasCustomMessage && !customMessage.trim()) return;
    const message = template.buildMessage(employeeName, customMessage);
    onSend(message, template.id);
    setSelectedTemplate(null);
    setCustomMessage('');
    setExpanded(false);
  };

  const preview = template ? template.buildMessage(employeeName, customMessage || '...') : '';

  return (
    <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors"
        style={{ color: 'var(--color-accent)', backgroundColor: expanded ? 'rgba(56,189,248,0.06)' : 'transparent' }}
      >
        <span>📋 Sjablonen</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Template grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className="text-left p-2 rounded-md border transition-all text-xs"
                style={{
                  borderColor: selectedTemplate === t.id ? '#38bdf8' : 'var(--color-border)',
                  backgroundColor: selectedTemplate === t.id ? 'rgba(56,189,248,0.1)' : 'var(--color-surface-light)',
                }}
              >
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t.description}</div>
              </button>
            ))}
          </div>

          {/* Custom message input */}
          {template?.hasCustomMessage && (
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={template.placeholder}
              rows={2}
              className="text-xs resize-none"
            />
          )}

          {/* Preview */}
          {template && (
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-[10px] mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                <Eye className="w-3 h-3" />
                {showPreview ? 'Verberg' : 'Voorbeeld'}
              </button>
              {showPreview && (
                <div className="p-2 rounded-md text-[11px] whitespace-pre-wrap" style={{
                  backgroundColor: 'rgba(22,163,74,0.08)',
                  border: '1px solid rgba(22,163,74,0.2)',
                  color: 'var(--color-text-primary)',
                }}>
                  {preview}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          {template && (
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={handleSend}
              disabled={sending || (template.hasCustomMessage && !customMessage.trim())}
              style={{ backgroundColor: '#16a34a', color: 'white' }}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Verstuur sjabloon
            </Button>
          )}
        </div>
      )}
    </div>
  );
}