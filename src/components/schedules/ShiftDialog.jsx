import React, { useState, useEffect } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Loader2, Trash2, Clock, Repeat } from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import ShiftConflictDialog from './ShiftConflictDialog';
import RecurringShiftDialog from './RecurringShiftDialog';
import DeleteShiftDialog from './DeleteShiftDialog';

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
  break_start_time: '',
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
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all shifts for conflict detection
  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts', scheduleId],
    queryFn: () => base44.entities.Shift.filter({ scheduleId }),
    enabled: !!scheduleId && open
  });

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
        break_start_time: shift.break_start_time || '',
        shift_type: shift.shift_type || 'regular',
        notes: shift.notes || '',
        has_break: hasBreak
      });
    } else {
      // Find the daypart to get default times and break duration
      const selectedDaypart = dayparts.find(dp => dp.id === daypartId);
      setFormData({
        ...defaultFormData,
        employeeId: employeeId || '',
        date: date || '',
        daypartId: daypartId || '',
        departmentId: schedule?.departmentIds?.[0] || '',
        start_time: shift?.start_time || selectedDaypart?.startTime || '09:00',
        end_time: selectedDaypart?.endTime || '17:00',
        break_duration: selectedDaypart?.break_duration || 30
      });
    }
  }, [shift, employeeId, date, daypartId, dayparts, open, schedule]);

  // Update times when daypart changes
  const handleDaypartChange = (newDaypartId) => {
    const selectedDaypart = dayparts.find(dp => dp.id === newDaypartId);
    setFormData(prev => ({
      ...prev,
      daypartId: newDaypartId,
      start_time: selectedDaypart?.startTime || prev.start_time,
      end_time: selectedDaypart?.endTime || prev.end_time,
      break_duration: selectedDaypart?.break_duration || prev.break_duration
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

  // Check for overlapping shifts
  const checkOverlap = (shift1, shift2) => {
    const start1 = shift1.start_time;
    const end1 = shift1.end_time;
    const start2 = shift2.start_time;
    const end2 = shift2.end_time;

    // Handle overnight shifts
    const isOvernight1 = end1 < start1;
    const isOvernight2 = end2 < start2;

    if (!isOvernight1 && !isOvernight2) {
      return start1 < end2 && start2 < end1;
    }

    // If either is overnight, they overlap unless they're completely separate
    return true;
  };

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
    if (!submitData.locationId) delete submitData.locationId;

    // Check for overlapping shifts
    const overlappingShifts = allShifts.filter(existingShift => {
      // Skip if it's the same shift we're editing
      if (shift?.id && existingShift.id === shift.id) return false;
      
      // Only check shifts for the same employee on the same date
      if (existingShift.employeeId !== submitData.employeeId) return false;
      if (existingShift.date !== submitData.date) return false;
      
      return checkOverlap(submitData, existingShift);
    });

    if (overlappingShifts.length > 0) {
      // Show conflict dialog
      setConflicts(overlappingShifts);
      setShowConflictDialog(true);
      return;
    }

    // No conflicts, proceed with save
    if (shift?.id) {
      await updateMutation.mutateAsync({ id: shift.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleResolveConflict = async (shiftsToKeep, shiftsToDelete) => {
    try {
      // Delete conflicting shifts
      for (const shiftId of shiftsToDelete) {
        await base44.entities.Shift.delete(shiftId);
      }

      // Save the new/updated shift if it was selected to keep
      const newShiftSelected = shiftsToKeep.some(s => s.id === 'new' || s.id === shift?.id);
      if (newShiftSelected) {
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
        
        delete submitData.has_break;
        if (!submitData.functionId) delete submitData.functionId;
        if (!submitData.daypartId) delete submitData.daypartId;
        if (!submitData.locationId) delete submitData.locationId;

        if (shift?.id) {
          await base44.entities.Shift.update(shift.id, submitData);
        } else {
          await base44.entities.Shift.create(submitData);
        }
      }

      queryClient.invalidateQueries(['shifts', scheduleId]);
      setShowConflictDialog(false);
      onClose();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  const handleDelete = () => {
    if (shift) {
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteConfirm = async (deleteOption) => {
    if (!shift) return;

    try {
      if (deleteOption === 'single') {
        // Delete only this shift
        await base44.entities.Shift.delete(shift.id);
      } else if (deleteOption === 'future') {
        // Delete this and all future similar shifts
        const similarShifts = allShifts.filter(s => 
          s.employeeId === shift.employeeId &&
          s.start_time === shift.start_time &&
          s.end_time === shift.end_time &&
          s.locationId === shift.locationId &&
          s.departmentId === shift.departmentId &&
          s.date >= shift.date &&
          s.scheduleId === shift.scheduleId
        );
        
        for (const shiftToDelete of similarShifts) {
          await base44.entities.Shift.delete(shiftToDelete.id);
        }
      } else if (deleteOption === 'all') {
        // Delete all similar shifts
        const similarShifts = allShifts.filter(s => 
          s.employeeId === shift.employeeId &&
          s.start_time === shift.start_time &&
          s.end_time === shift.end_time &&
          s.locationId === shift.locationId &&
          s.departmentId === shift.departmentId &&
          s.scheduleId === shift.scheduleId
        );
        
        for (const shiftToDelete of similarShifts) {
          await base44.entities.Shift.delete(shiftToDelete.id);
        }
      }

      queryClient.invalidateQueries(['shifts', scheduleId]);
    } catch (error) {
      console.error('Error deleting shifts:', error);
      alert('Er ging iets mis bij het verwijderen van de diensten');
    } finally {
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const handleRecurringSubmit = async (recurringConfig) => {
    const departmentId = formData.departmentId || schedule?.departmentIds?.[0] || null;
    const locationId = formData.locationId || schedule?.locationIds?.[0] || null;
    
    const baseShiftData = {
      ...formData,
      companyId: currentCompany?.id,
      scheduleId,
      departmentId,
      locationId,
      break_duration: formData.has_break ? parseInt(formData.break_duration) || 30 : 0
    };
    
    delete baseShiftData.has_break;
    if (!baseShiftData.functionId) delete baseShiftData.functionId;
    if (!baseShiftData.daypartId) delete baseShiftData.daypartId;
    if (!baseShiftData.locationId) delete baseShiftData.locationId;

    // Use date-fns for reliable date calculations
    const startDate = parseISO(formData.date);
    const endDate = parseISO(recurringConfig.endDate);
    const shiftsToCreate = [];
    
    const totalDays = differenceInDays(endDate, startDate) + 1;

    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(startDate, i);
      const dayOfWeek = currentDate.getDay();
      
      const shouldInclude = recurringConfig.recurringType === 'daily' || 
        (recurringConfig.recurringType === 'weekly' && recurringConfig.selectedDays.includes(dayOfWeek));
      
      if (shouldInclude) {
        shiftsToCreate.push({
          ...baseShiftData,
          date: format(currentDate, 'yyyy-MM-dd')
        });
      }
    }

    // Create all shifts
    try {
      for (const shiftData of shiftsToCreate) {
        await base44.entities.Shift.create(shiftData);
      }
      queryClient.invalidateQueries(['shifts', scheduleId]);
      setShowRecurringDialog(false);
      onClose();
    } catch (error) {
      console.error('Error creating recurring shifts:', error);
      alert('Er ging iets mis bij het aanmaken van de herhaaldelijke diensten');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const formattedDate = formData.date 
    ? format(parseISO(formData.date), 'EEEE d MMMM yyyy', { locale: nl })
    : '';

  const sortedDayparts = [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <>
      <DeleteShiftDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        shift={shift}
      />

      <RecurringShiftDialog
        open={showRecurringDialog}
        onClose={() => setShowRecurringDialog(false)}
        onConfirm={handleRecurringSubmit}
        initialDate={formData.date}
      />

      <ShiftConflictDialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        conflicts={conflicts}
        newShift={{
          ...formData,
          id: shift?.id,
          companyId: currentCompany?.id,
          scheduleId,
          departmentId: formData.departmentId || schedule?.departmentIds?.[0] || null,
          locationId: formData.locationId || schedule?.locationIds?.[0] || null,
        }}
        onResolve={handleResolveConflict}
        employees={employees}
        locations={locations}
        departments={departments}
      />

      <Dialog open={open && !showConflictDialog && !showRecurringDialog && !showDeleteDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-lg" style={{ 
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--color-text-primary)' }}>
            {shift ? 'Dienst bewerken' : 'Nieuwe dienst'}
          </DialogTitle>
          {formattedDate && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{formattedDate}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employeeId" style={{ color: 'var(--color-text-primary)' }}>Medewerker *</Label>
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
              <Label htmlFor="start_time" style={{ color: 'var(--color-text-primary)' }}>Starttijd *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time" style={{ color: 'var(--color-text-primary)' }}>Eindtijd *</Label>
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
              <Label htmlFor="has_break" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" style={{ color: 'var(--color-text-primary)' }}>
                Pauze toevoegen
              </Label>
            </div>
            
            {formData.has_break && (
              <div className="ml-6 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="break_duration" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Pauze duur (minuten)</Label>
                    <Input
                      id="break_duration"
                      type="number"
                      value={formData.break_duration}
                      onChange={(e) => setFormData({ ...formData, break_duration: e.target.value })}
                      min={0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="break_start_time" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Pauze start</Label>
                    <Input
                      id="break_start_time"
                      type="time"
                      value={formData.break_start_time}
                      onChange={(e) => setFormData({ ...formData, break_start_time: e.target.value })}
                      className="mt-1"
                      placeholder="Optioneel"
                    />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  De pauze wordt aan het rooster toegevoegd en komt bovenop de werktijd
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="locationId" style={{ color: 'var(--color-text-primary)' }}>Locatie *</Label>
            <Select 
              value={formData.locationId || 'auto'} 
              onValueChange={(v) => setFormData({ ...formData, locationId: v === 'auto' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer locatie" />
              </SelectTrigger>
              <SelectContent>
                {schedule?.locationIds && schedule.locationIds.length > 0 ? (
                  locations
                    .filter(loc => schedule.locationIds.includes(loc.id))
                    .map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))
                ) : (
                  locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="departmentId" style={{ color: 'var(--color-text-primary)' }}>Afdeling *</Label>
            <Select 
              value={formData.departmentId} 
              onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer afdeling" />
              </SelectTrigger>
              <SelectContent>
                {schedule?.departmentIds && schedule.departmentIds.length > 0 ? (
                  departments
                    .filter(dept => schedule.departmentIds.includes(dept.id))
                    .map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))
                ) : (
                  departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="shift_type" style={{ color: 'var(--color-text-primary)' }}>Type dienst</Label>
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
            <Label htmlFor="functionId" style={{ color: 'var(--color-text-primary)' }}>Functie</Label>
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
            <Label htmlFor="notes" style={{ color: 'var(--color-text-primary)' }}>Notities</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Eventuele opmerkingen..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className={`flex gap-3 ${!shift?.id ? 'ml-auto' : ''}`}>
              {shift?.id && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Verwijderen
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)'
              }}>
                Annuleren
              </Button>
              {!shift?.id && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowRecurringDialog(true)}
                  className="border-blue-200 hover:bg-blue-50"
                  disabled={!formData.employeeId || !formData.date}
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Herhaaldelijk
                </Button>
              )}
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {shift?.id ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}