import React, { useState, useEffect } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

const shiftTypes = [
  { value: 'regular', label: 'Regulier' },
  { value: 'overtime', label: 'Overwerk' },
  { value: 'standby', label: 'Stand-by' },
  { value: 'on_call', label: 'Bereikbaar' },
  { value: 'training', label: 'Training' },
];

const defaultFormData = {
  employeeId: '',
  departmentId: '',
  daypartId: '',
  locationId: '',
  functionId: '',
  date: '',
  start_time: '09:00',
  end_time: '17:00',
  break_duration: 0,
  shift_type: 'regular',
  notes: '',
  has_break: false
};

export default function ShiftDialog({
  open,
  onClose,
  shift,
  scheduleId,
  employeeId,
  date,
  daypartId,
  employees,
  departments,
  dayparts = [],
  locations,
  functions,
  schedule
}) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (shift?.id) {
      const hasBreak = shift.break_duration && shift.break_duration > 0;
      setFormData({
        employeeId: shift.employeeId || '',
        departmentId: shift.departmentId || '',
        daypartId: shift.daypartId || '',
        locationId: shift.locationId || '',
        functionId: shift.functionId || '',
        date: shift.date || '',
        start_time: shift.start_time || '09:00',
        end_time: shift.end_time || '17:00',
        break_duration: shift.break_duration || 30,
        shift_type: shift.shift_type || 'regular',
        notes: shift.notes || '',
        has_break: hasBreak
      });
    } else {
      // Find the daypart to get default times
      const selectedDaypart = dayparts.find(dp => dp.id === daypartId);
      setFormData({
        ...defaultFormData,
        employeeId: employeeId || '',
        date: date || '',
        daypartId: daypartId || '',
        start_time: shift?.start_time || selectedDaypart?.startTime || '09:00',
        end_time: selectedDaypart?.endTime || '17:00'
      });
    }
  }, [shift, employeeId, date, daypartId, dayparts, open]);

  // Update times when daypart changes
  const handleDaypartChange = (newDaypartId) => {
    const selectedDaypart = dayparts.find(dp => dp.id === newDaypartId);
    setFormData(prev => ({
      ...prev,
      daypartId: newDaypartId,
      start_time: selectedDaypart?.startTime || prev.start_time,
      end_time: selectedDaypart?.endTime || prev.end_time
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts', scheduleId]);
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts', scheduleId]);
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts', scheduleId]);
      onClose();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Auto-populate department and location from schedule
    const departmentId = formData.departmentId || schedule?.departmentIds?.[0] || null;
    const locationId = formData.locationId || schedule?.locationIds?.[0] || null;
    
    const submitData = {
      ...formData,
      companyId: currentCompany?.id,
      scheduleId,
      departmentId,
      locationId,
      break_duration: formData.has_break ? parseInt(formData.break_duration) || 30 : 0
    };
    
    // Remove has_break from the data sent to the backend
    delete submitData.has_break;
    
    // Remove empty fields
    if (!submitData.functionId) delete submitData.functionId;
    if (!submitData.daypartId) delete submitData.daypartId;
    if (!submitData.departmentId) delete submitData.departmentId;
    if (!submitData.locationId) delete submitData.locationId;

    if (shift?.id) {
      await updateMutation.mutateAsync({ id: shift.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async () => {
    if (shift && window.confirm('Weet je zeker dat je deze dienst wilt verwijderen?')) {
      await deleteMutation.mutateAsync(shift.id);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const formattedDate = formData.date 
    ? format(parseISO(formData.date), 'EEEE d MMMM yyyy', { locale: nl })
    : '';

  const sortedDayparts = [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {shift ? 'Dienst bewerken' : 'Nieuwe dienst'}
          </DialogTitle>
          {formattedDate && (
            <p className="text-sm text-slate-500">{formattedDate}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employeeId">Medewerker *</Label>
            <Select 
              value={formData.employeeId} 
              onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer medewerker" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Starttijd *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">Eindtijd *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox 
                id="has_break"
                checked={formData.has_break}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  has_break: checked,
                  break_duration: checked ? (formData.break_duration || 30) : 0
                })}
              />
              <Label htmlFor="has_break" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Pauze toevoegen (komt bovenop de dienst)
              </Label>
            </div>
            
            {formData.has_break && (
              <div className="ml-6 mb-4">
                <Label htmlFor="break_duration" className="text-sm">Pauze duur (minuten)</Label>
                <Input
                  id="break_duration"
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
            <Label htmlFor="shift_type">Type dienst</Label>
            <Select 
              value={formData.shift_type} 
              onValueChange={(v) => setFormData({ ...formData, shift_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shiftTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>



          <div>
            <Label htmlFor="functionId">Functie</Label>
            <Select 
              value={formData.functionId || 'none'} 
              onValueChange={(v) => setFormData({ ...formData, functionId: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer functie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen</SelectItem>
                {functions.map((func) => (
                  <SelectItem key={func.id} value={func.id}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notities</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Eventuele opmerkingen..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            {shift?.id && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleDelete}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Verwijderen
              </Button>
            )}
            <div className={`flex gap-3 ${!shift?.id ? 'ml-auto' : ''}`}>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {shift?.id ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}