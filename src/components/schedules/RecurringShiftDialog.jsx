import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Calendar, Repeat } from 'lucide-react';

export default function RecurringShiftDialog({ 
  open, 
  onClose, 
  onConfirm,
  initialDate 
}) {
  const [recurringType, setRecurringType] = useState('daily'); // daily, weekly, custom
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Monday to Friday by default

  const weekDays = [
    { id: 1, label: 'Ma', fullLabel: 'Maandag' },
    { id: 2, label: 'Di', fullLabel: 'Dinsdag' },
    { id: 3, label: 'Wo', fullLabel: 'Woensdag' },
    { id: 4, label: 'Do', fullLabel: 'Donderdag' },
    { id: 5, label: 'Vr', fullLabel: 'Vrijdag' },
    { id: 6, label: 'Za', fullLabel: 'Zaterdag' },
    { id: 0, label: 'Zo', fullLabel: 'Zondag' }
  ];

  const toggleDay = (dayId) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleConfirm = () => {
    onConfirm({
      recurringType,
      endDate,
      selectedDays: recurringType === 'weekly' ? selectedDays : null
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#38bdf8]" />
            Herhaling instellen
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--color-text-secondary)' }}>
            Plan deze dienst herhaaldelijk in volgens een patroon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label style={{ color: 'var(--color-text-primary)' }}>Herhaalpatroon</Label>
            <Select value={recurringType} onValueChange={setRecurringType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Iedere dag</SelectItem>
                <SelectItem value="weekly">Specifieke dagen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurringType === 'weekly' && (
            <div>
              <Label className="mb-3 block" style={{ color: 'var(--color-text-primary)' }}>Selecteer dagen</Label>
              <div className="flex gap-2">
                {weekDays.map(day => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                      selectedDays.includes(day.id)
                        ? 'bg-[#38bdf8] text-white shadow-md'
                        : 'bg-[#3d3866] text-slate-300 hover:bg-[#475569]'
                    }`}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-sm text-red-600 mt-2">Selecteer minimaal één dag</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="endDate" style={{ color: 'var(--color-text-primary)' }}>Herhalen tot *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={initialDate}
              className="mt-1"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              De dienst wordt herhaald tot en met deze datum
            </p>
          </div>

          {endDate && initialDate && (
            <div className="bg-[#2d2a3e] border border-[#3d3866] rounded-lg p-3">
              <p className="text-sm text-slate-300">
                <Calendar className="w-4 h-4 inline mr-1" />
                {recurringType === 'daily' ? (
                  <>Deze dienst wordt <strong>dagelijks</strong> ingepland van {initialDate} tot {endDate}</>
                ) : (
                  <>Deze dienst wordt ingepland op <strong>{selectedDays.map(id => weekDays.find(d => d.id === id)?.label).join(', ')}</strong> van {initialDate} tot {endDate}</>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!endDate || (recurringType === 'weekly' && selectedDays.length === 0)}
            className="bg-[#38bdf8] hover:bg-[#0ea5e9]"
          >
            Bevestigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}