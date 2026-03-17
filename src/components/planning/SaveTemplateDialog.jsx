import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';

export default function SaveTemplateDialog({ open, onClose, requiredHours, companyId, onSaved }) {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState(1);

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.entities.AISuggestion.create({
        companyId,
        context_type: 'alternative_schedule',
        trigger: 'manual',
        description: name,
        suggested_patch: {
          requiredHours,
          repeatWeeks: weeks,
        },
        status: 'pending',
      }),
    onSuccess: onSaved,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opslaan als template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Naam van de template</Label>
            <Input
              id="tpl-name"
              placeholder="bijv. Weekrooster Zomer, Rooster Drukke Periode..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-weeks">Herhaal voor hoeveel weken?</Label>
            <Input
              id="tpl-weeks"
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
            />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              De planner kan deze template later in één klik voor {weeks} {weeks === 1 ? 'week' : 'weken'} aaneen inroosteren.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}