import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function DeleteShiftDialog({ 
  open, 
  onClose, 
  onConfirm,
  shift
}) {
  const [deleteOption, setDeleteOption] = useState('single');

  const handleConfirm = () => {
    onConfirm(deleteOption);
    onClose();
  };

  const formattedDate = shift?.date 
    ? format(parseISO(shift.date), 'd MMMM yyyy', { locale: nl })
    : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)'
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Dienst verwijderen
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--color-text-secondary)' }}>
            Selecteer welke diensten je wilt verwijderen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <button
            type="button"
            onClick={() => setDeleteOption('single')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              deleteOption === 'single'
                ? 'border-[#38bdf8] bg-[#38bdf8]/10'
                : 'border-[#3d3866] bg-[#2d2a3e] hover:border-[#475569]'
            }`}
          >
            <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Alleen deze dienst
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Verwijder alleen de dienst op {formattedDate}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDeleteOption('future')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              deleteOption === 'future'
                ? 'border-[#38bdf8] bg-[#38bdf8]/10'
                : 'border-[#3d3866] bg-[#2d2a3e] hover:border-[#475569]'
            }`}
          >
            <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Deze en alle toekomstige diensten
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Verwijder alle gelijksoortige diensten vanaf {formattedDate}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDeleteOption('all')}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              deleteOption === 'all'
                ? 'border-[#38bdf8] bg-[#38bdf8]/10'
                : 'border-[#3d3866] bg-[#2d2a3e] hover:border-[#475569]'
            }`}
          >
            <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Alle gelijksoortige diensten
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Verwijder alle diensten met dezelfde eigenschappen (verleden, heden en toekomst)
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Verwijderen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}