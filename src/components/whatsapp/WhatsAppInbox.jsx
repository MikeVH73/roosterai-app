import React, { useState } from 'react';
import { useCompany } from '../providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, CheckCircle2, XCircle, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function WhatsAppInbox({ open, onOpenChange, scheduleId }) {
  const { currentCompany } = useCompany();
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['whatsapp-logs', currentCompany?.id, scheduleId],
    queryFn: async () => {
      const filters = { companyId: currentCompany.id };
      if (scheduleId) {
        filters.scheduleId = scheduleId;
      }
      return await base44.entities.WhatsAppMessageLog.filter(filters, '-created_date', 100);
    },
    enabled: open && !!currentCompany
  });

  const { data: schedule } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => base44.entities.Schedule.filter({ id: scheduleId }),
    enabled: !!scheduleId && open,
    select: (data) => data[0]
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            WhatsApp Berichten
            {schedule && (
              <span className="text-sm font-normal text-slate-500">
                • {schedule.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-500">Laden...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">Geen WhatsApp berichten gevonden</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {log.status === 'sent' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                          {log.status === 'sent' ? 'Verzonden' : 'Mislukt'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.created_date), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{log.recipient_name}</span>
                      <span className="text-sm text-slate-500">• {log.recipient_phone}</span>
                    </div>

                    <div className="text-sm text-slate-700 font-medium">
                      {log.subject}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Verzonden door: {log.sent_by}</span>
                    </div>

                    {log.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <span className="font-medium">Fout:</span> {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-slate-500">
            {logs.length} {logs.length === 1 ? 'bericht' : 'berichten'} gevonden
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}