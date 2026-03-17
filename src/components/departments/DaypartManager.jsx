import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Clock,
  Loader2,
  Coffee
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const colorOptions = [
  { value: '#FEF3C7', label: 'Geel (ochtend)' },
  { value: '#DBEAFE', label: 'Blauw (middag)' },
  { value: '#E0E7FF', label: 'Indigo (avond)' },
  { value: '#F3E8FF', label: 'Paars (nacht)' },
  { value: '#D1FAE5', label: 'Groen' },
  { value: '#FEE2E2', label: 'Rood' },
];

export default function DaypartManager({ departmentId, dayparts = [], onUpdate }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDaypart, setSelectedDaypart] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00',
    endTime: '12:00',
    color: '#FEF3C7',
    sortOrder: 0,
    has_break: false,
    break_duration: 30
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DepartmentDaypart.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dayparts', companyId]);
      onUpdate?.();
      closeDialog();
      toast.success('Dagdeel toegevoegd');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DepartmentDaypart.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['dayparts', companyId]);
      onUpdate?.();
      closeDialog();
      toast.success('Dagdeel bijgewerkt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DepartmentDaypart.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['dayparts', companyId]);
      onUpdate?.();
      toast.success('Dagdeel verwijderd');
    }
  });

  const openDialog = (daypart = null) => {
    if (daypart) {
      setSelectedDaypart(daypart);
      setFormData({
        name: daypart.name || '',
        startTime: daypart.startTime || '08:00',
        endTime: daypart.endTime || '12:00',
        color: daypart.color || '#FEF3C7',
        sortOrder: daypart.sortOrder || 0,
        has_break: (daypart.break_duration || 0) > 0,
        break_duration: daypart.break_duration || 30
      });
    } else {
      setSelectedDaypart(null);
      const maxOrder = Math.max(0, ...dayparts.map(d => d.sortOrder || 0));
      setFormData({
        name: '',
        startTime: '08:00',
        endTime: '12:00',
        color: '#FEF3C7',
        sortOrder: maxOrder + 1,
        has_break: false,
        break_duration: 30
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedDaypart(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { 
      ...formData, 
      companyId,
      departmentId,
      break_duration: formData.has_break ? parseInt(formData.break_duration) || 30 : 0
    };
    delete submitData.has_break;

    if (selectedDaypart) {
      await updateMutation.mutateAsync({ id: selectedDaypart.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (daypart) => {
    if (window.confirm(`Weet je zeker dat je "${daypart.name}" wilt verwijderen?`)) {
      await deleteMutation.mutateAsync(daypart.id);
    }
  };

  const sortedDayparts = [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Clock className="w-4 h-4" />
            Dagdelen
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Toevoegen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedDayparts.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <p>Nog geen dagdelen gedefinieerd.</p>
            <p className="mt-1">Dagdelen helpen bij het structureren van het rooster.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedDayparts.map((daypart) => (
              <div 
                key={daypart.id}
                className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                style={{ backgroundColor: daypart.color || 'var(--color-surface-light)', borderColor: 'var(--color-border)' }}
              >
                <GripVertical className="w-4 h-4 cursor-grab" style={{ color: '#64748b' }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: '#1e293b' }}>{daypart.name}</p>
                  <p className="text-sm" style={{ color: '#475569' }}>
                    {daypart.startTime} - {daypart.endTime}
                    {daypart.break_duration > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        {daypart.break_duration} min pauze
                      </span>
                    )}
                    {(!daypart.break_duration || daypart.break_duration === 0) && (
                      <span className="ml-2 opacity-60">• geen pauze</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openDialog(daypart)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(daypart)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDaypart ? 'Dagdeel bewerken' : 'Nieuw dagdeel'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="daypart-name">Naam *</Label>
                <Input
                  id="daypart-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="bijv. Ochtend, Middag, Avond"
                  required
                />
              </div>
              <div>
                <Label htmlFor="daypart-sortorder">Positie</Label>
                <Input
                  id="daypart-sortorder"
                  type="number"
                  min={1}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Volgorde in rooster</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Starttijd *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">Eindtijd *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox 
                  id="daypart-has-break"
                  checked={formData.has_break}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    has_break: checked,
                    break_duration: checked ? (formData.break_duration || 30) : 0
                  })}
                />
                <Label htmlFor="daypart-has-break" className="text-sm font-medium leading-none">
                  Pauze in dit dagdeel
                </Label>
              </div>
              {formData.has_break && (
                <div className="ml-6 mb-2">
                  <Label htmlFor="daypart-break-duration" className="text-sm">Pauze duur (minuten)</Label>
                  <Input
                    id="daypart-break-duration"
                    type="number"
                    value={formData.break_duration}
                    onChange={(e) => setFormData({ ...formData, break_duration: e.target.value })}
                    min={0}
                    className="mt-1 w-32"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Kleur</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.color === color.value ? 'border-slate-400 ring-2 ring-offset-2 ring-slate-300' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedDaypart ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}