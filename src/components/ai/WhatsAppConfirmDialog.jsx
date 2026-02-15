import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WhatsAppConfirmDialog({ 
  open, 
  onOpenChange, 
  employees = [],
  defaultMessage = '',
  context = ''
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setResults([]);
      setSent(false);
    }
  }, [open, defaultMessage]);

  const handleSend = async () => {
    setSending(true);
    const newResults = [];

    for (const employee of employees) {
      if (!employee.phone) {
        newResults.push({
          employee: employee,
          success: false,
          error: 'Geen telefoonnummer beschikbaar'
        });
        continue;
      }

      try {
        const response = await base44.functions.invoke('sendWhatsAppMessage', {
          phoneNumber: employee.phone,
          message: message,
          employeeName: `${employee.first_name} ${employee.last_name}`
        });

        newResults.push({
          employee: employee,
          success: true,
          messageId: response.data.messageId
        });
      } catch (error) {
        newResults.push({
          employee: employee,
          success: false,
          error: error.message || 'Fout bij verzenden'
        });
      }
    }

    setResults(newResults);
    setSent(true);
    setSending(false);

    const successCount = newResults.filter(r => r.success).length;
    const failCount = newResults.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount} WhatsApp bericht${successCount > 1 ? 'en' : ''} verzonden`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} bericht${failCount > 1 ? 'en' : ''} niet verzonden`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            WhatsApp Berichten Versturen
          </DialogTitle>
          <DialogDescription>
            {context && <p className="text-sm mb-2">{context}</p>}
            Verzend een WhatsApp bericht naar de geselecteerde medewerkers
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ontvangers ({employees.length})
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg max-h-32 overflow-y-auto">
                  {employees.map((emp) => (
                    <Badge key={emp.id} variant="outline" className="flex items-center gap-2">
                      {emp.first_name} {emp.last_name}
                      {!emp.phone && (
                        <span className="text-red-500 text-xs">⚠️ Geen tel.</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Bericht
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Typ hier je WhatsApp bericht..."
                  className="resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {message.length} karakters
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Annuleren
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={sending || !message.trim() || employees.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verzenden...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Verstuur naar {employees.length} {employees.length === 1 ? 'persoon' : 'personen'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="font-medium">Resultaten</h3>
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                    backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
                    borderColor: result.success ? '#86efac' : '#fca5a5'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {result.employee.first_name} {result.employee.last_name}
                      </p>
                      {result.success ? (
                        <p className="text-xs text-green-700">
                          Verzonden naar {result.employee.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-red-700">
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>
                Sluiten
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}