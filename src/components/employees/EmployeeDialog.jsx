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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

const defaultFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  employee_number: '',
  color: '#3B82F6',
  contract_hours: '',
  contract_type: 'fulltime',
  hourly_rate: '',
  start_date: '',
  functionId: '',
  departmentIds: [],
  preferences: {
    preferred_days: [],
    preferred_shifts: [],
    max_hours_per_week: '',
    notes: ''
  },
  status: 'active'
};

const daysOfWeek = [
  { value: 'monday', label: 'Maandag' },
  { value: 'tuesday', label: 'Dinsdag' },
  { value: 'wednesday', label: 'Woensdag' },
  { value: 'thursday', label: 'Donderdag' },
  { value: 'friday', label: 'Vrijdag' },
  { value: 'saturday', label: 'Zaterdag' },
  { value: 'sunday', label: 'Zondag' },
];

const shiftTypes = [
  { value: 'morning', label: 'Ochtend' },
  { value: 'afternoon', label: 'Middag' },
  { value: 'evening', label: 'Avond' },
  { value: 'night', label: 'Nacht' },
];

export default function EmployeeDialog({ open, onClose, employee, departments, functions }) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(defaultFormData);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (employee) {
      setFormData({
        ...defaultFormData,
        ...employee,
        contract_hours: employee.contract_hours?.toString() || '',
        hourly_rate: employee.hourly_rate?.toString() || '',
        preferences: {
          ...defaultFormData.preferences,
          ...employee.preferences,
          max_hours_per_week: employee.preferences?.max_hours_per_week?.toString() || ''
        }
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('general');
  }, [employee, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees', currentCompany?.id]);
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees', currentCompany?.id]);
      onClose();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      companyId: currentCompany?.id,
      contract_hours: formData.contract_hours ? parseFloat(formData.contract_hours) : null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      preferences: {
        ...formData.preferences,
        max_hours_per_week: formData.preferences.max_hours_per_week 
          ? parseFloat(formData.preferences.max_hours_per_week) 
          : null
      }
    };

    if (employee) {
      await updateMutation.mutateAsync({ id: employee.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updatePreference = (field, value) => {
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    }));
  };

  const toggleDepartment = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }));
  };

  const toggleDay = (day) => {
    const currentDays = formData.preferences.preferred_days || [];
    updatePreference(
      'preferred_days',
      currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day]
    );
  };

  const toggleShift = (shift) => {
    const currentShifts = formData.preferences.preferred_shifts || [];
    updatePreference(
      'preferred_shifts',
      currentShifts.includes(shift)
        ? currentShifts.filter(s => s !== shift)
        : [...currentShifts, shift]
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--color-text-primary)' }}>
            {employee ? 'Medewerker bewerken' : 'Nieuwe medewerker'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-11" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <TabsTrigger 
                value="general" 
                className="h-full"
                style={{ 
                  backgroundColor: activeTab === 'general' ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === 'general' ? 'white' : 'var(--color-text-primary)',
                  border: 'none'
                }}
              >
                Algemeen
              </TabsTrigger>
              <TabsTrigger 
                value="contract"
                className="h-full"
                style={{ 
                  backgroundColor: activeTab === 'contract' ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === 'contract' ? 'white' : 'var(--color-text-primary)',
                  border: 'none'
                }}
              >
                Contract
              </TabsTrigger>
              <TabsTrigger 
                value="preferences"
                className="h-full"
                style={{ 
                  backgroundColor: activeTab === 'preferences' ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === 'preferences' ? 'white' : 'var(--color-text-primary)',
                  border: 'none'
                }}
              >
                Voorkeuren
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4 min-h-[400px]">
              <TabsContent value="general" className="space-y-4 mt-0 h-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Voornaam *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Achternaam *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_number">Personeelsnummer</Label>
                    <Input
                      id="employee_number"
                      value={formData.employee_number}
                      onChange={(e) => updateField('employee_number', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actief</SelectItem>
                        <SelectItem value="inactive">Inactief</SelectItem>
                        <SelectItem value="on_leave">Afwezig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label style={{ color: 'var(--color-text-primary)' }}>Afdelingen</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${dept.id}`}
                          checked={formData.departmentIds.includes(dept.id)}
                          onCheckedChange={() => toggleDepartment(dept.id)}
                        />
                        <Label htmlFor={`dept-${dept.id}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                          {dept.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="functionId">Functie</Label>
                  <Select value={formData.functionId} onValueChange={(v) => updateField('functionId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een functie" />
                    </SelectTrigger>
                    <SelectContent>
                      {functions.map((func) => (
                        <SelectItem key={func.id} value={func.id}>{func.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Kleur (voor rooster)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => updateField('color', e.target.value)}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => updateField('color', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contract" className="space-y-4 mt-0 h-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contract_type">Contracttype</Label>
                    <Select value={formData.contract_type} onValueChange={(v) => updateField('contract_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fulltime">Fulltime</SelectItem>
                        <SelectItem value="parttime">Parttime</SelectItem>
                        <SelectItem value="flex">Flex</SelectItem>
                        <SelectItem value="oproep">Oproepkracht</SelectItem>
                        <SelectItem value="stagiair">Stagiair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contract_hours">Contracturen per week</Label>
                    <Input
                      id="contract_hours"
                      type="number"
                      value={formData.contract_hours}
                      onChange={(e) => updateField('contract_hours', e.target.value)}
                      placeholder="40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hourly_rate">Uurtarief (€)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => updateField('hourly_rate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Startdatum</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => updateField('start_date', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4 mt-0 h-full">
                <div>
                  <Label style={{ color: 'var(--color-text-primary)' }}>Voorkeursdagen</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={(formData.preferences.preferred_days || []).includes(day.value)}
                          onCheckedChange={() => toggleDay(day.value)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label style={{ color: 'var(--color-text-primary)' }}>Voorkeursdiensten</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {shiftTypes.map((shift) => (
                      <div key={shift.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`shift-${shift.value}`}
                          checked={(formData.preferences.preferred_shifts || []).includes(shift.value)}
                          onCheckedChange={() => toggleShift(shift.value)}
                        />
                        <Label htmlFor={`shift-${shift.value}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                          {shift.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="max_hours">Max uren per week</Label>
                  <Input
                    id="max_hours"
                    type="number"
                    value={formData.preferences.max_hours_per_week}
                    onChange={(e) => updatePreference('max_hours_per_week', e.target.value)}
                    placeholder="40"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Opmerkingen</Label>
                  <Textarea
                    id="notes"
                    value={formData.preferences.notes}
                    onChange={(e) => updatePreference('notes', e.target.value)}
                    placeholder="Bijzonderheden over beschikbaarheid..."
                    rows={3}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {employee ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}