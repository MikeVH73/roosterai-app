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
  context = '',
  companyId = null,
  scheduleId = null,
  aiSuggestionId = null,
  subject = 'WhatsApp bericht',
  allowSelection = false
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [sent, setSent] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  React.useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setResults([]);
      setSent(false);
      setSelectedEmployees(allowSelection ? [] : employees);
    }
  }, [open, defaultMessage, allowSelection, employees]);

  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.some(e => e.id === empId)
        ? prev.filter(e => e.id !== empId)
        : [...prev, employees.find(e => e.id === empId)]
    );
  };

  const handleSend = async () => {
    setSending(true);
    const newResults = [];
    const employeesToSend = allowSelection ? selectedEmployees : employees;

    for (const employee of employeesToSend) {
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
          employeeName: `${employee.first_name} ${employee.last_name}`,
          companyId: companyId,
          scheduleId: scheduleId,
          aiSuggestionId: aiSuggestionId,
          subject: subject
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
            <MessageCircle className="w-5 h-5 text-[#10b981]" />
            {context || 'WhatsApp Berichten Versturen'}
          </DialogTitle>
          {allowSelection && (
            <DialogDescription>
              Selecteer medewerkers en verzend een WhatsApp bericht
            </DialogDescription>
          )}
        </DialogHeader>

        {!sent ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {allowSelection ? `Medewerkers (${selectedEmployees.length} geselecteerd)` : `Ontvangers (${employees.length})`}
                </label>
                {employees.length === 0 ? (
                  <div className="p-4 bg-[#1e293b] rounded-lg border border-[#334155] text-center">
                    <p className="text-slate-400 text-sm">Geen actieve medewerkers gevonden</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-[#1e293b] rounded-lg max-h-40 overflow-y-auto border border-[#334155]">
                  {employees.map((emp) => {
                    const isSelected = allowSelection ? selectedEmployees.some(e => e.id === emp.id) : true;
                    return (
                      <Badge 
                        key={emp.id} 
                        variant="outline"
                        className={`flex items-center gap-2 cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-[#0ea5e9] border-[#38bdf8] text-white' 
                            : 'bg-[#334155] border-[#475569] text-slate-300 hover:bg-[#475569]'
                        }`}
                        onClick={() => allowSelection && toggleEmployee(emp.id)}
                      >
                        {emp.first_name} {emp.last_name}
                        {!emp.phone && (
                          <span className="text-red-400 text-xs">⚠️ Geen tel.</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
                )}
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
                disabled={sending || !message.trim() || (allowSelection && selectedEmployees.length === 0)}
                className="bg-[#10b981] hover:bg-[#059669] text-white"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verzenden...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Verstuur naar {allowSelection ? selectedEmployees.length : employees.length} {(allowSelection ? selectedEmployees.length : employees.length) === 1 ? 'persoon' : 'personen'}
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