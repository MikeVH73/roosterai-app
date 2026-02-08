import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Target,
  Loader2,
  Calendar
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const daysOfWeek = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' },
];

export default function StaffingRequirementsManager({ departmentId, dayparts = [], requirements = [], onUpdate }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [formData, setFormData] = useState({
    daypartId: '',
    day_of_week: '',
    targetHours: '',
    min_staff: 1,
    optimal_staff: '',
    priority: 'medium'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffingRequirement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staffing-requirements', companyId, departmentId]);
      onUpdate?.();
      closeDialog();
      toast.success('Bezettingsnorm toegevoegd');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffingRequirement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staffing-requirements', companyId, departmentId]);
      onUpdate?.();
      closeDialog();
      toast.success('Bezettingsnorm bijgewerkt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffingRequirement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['staffing-requirements', companyId, departmentId]);
      onUpdate?.();
      toast.success('Bezettingsnorm verwijderd');
    }
  });

  const openDialog = (req = null) => {
    if (req) {
      setSelectedReq(req);
      setFormData({
        daypartId: req.daypartId || '',
        day_of_week: req.day_of_week?.toString() || '',
        targetHours: req.targetHours?.toString() || '',
        min_staff: req.min_staff || 1,
        optimal_staff: req.optimal_staff?.toString() || '',
        priority: req.priority || 'medium'
      });
    } else {
      setSelectedReq(null);
      setFormData({
        daypartId: dayparts[0]?.id || '',
        day_of_week: '1',
        targetHours: '',
        min_staff: 1,
        optimal_staff: '',
        priority: 'medium'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedReq(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { 
      ...formData, 
      companyId,
      departmentId,
      day_of_week: parseInt(formData.day_of_week),
      targetHours: parseFloat(formData.targetHours),
      min_staff: parseInt(formData.min_staff),
      optimal_staff: formData.optimal_staff ? parseInt(formData.optimal_staff) : null
    };

    if (selectedReq) {
      await updateMutation.mutateAsync({ id: selectedReq.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (req) => {
    if (window.confirm('Weet je zeker dat je deze bezettingsnorm wilt verwijderen?')) {
      await deleteMutation.mutateAsync(req.id);
    }
  };

  const getDaypartName = (id) => dayparts.find(d => d.id === id)?.name || 'Onbekend';
  const getDayName = (dow) => daysOfWeek.find(d => d.value === dow)?.label || 'Onbekend';

  const sortedDayparts = [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Group requirements by daypart
  const groupedReqs = {};
  sortedDayparts.forEach(dp => {
    groupedReqs[dp.id] = daysOfWeek.map(day => {
      const req = requirements.find(r => r.daypartId === dp.id && r.day_of_week === day.value);
      return { day, req, daypart: dp };
    });
  });

  if (dayparts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-2">Eerst dagdelen instellen</h3>
          <p className="text-sm text-slate-500">
            Definieer eerst dagdelen voordat je bezettingsnormen kunt instellen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Bezettingsnormen (uren per dagdeel)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Toevoegen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Dagdeel</TableHead>
                {daysOfWeek.map(day => (
                  <TableHead key={day.value} className="text-center w-24">
                    {day.label.substring(0, 2)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDayparts.map(daypart => (
                <TableRow key={daypart.id}>
                  <TableCell>
                    <div 
                      className="px-2 py-1 rounded text-sm font-medium"
                      style={{ backgroundColor: daypart.color || '#F8FAFC' }}
                    >
                      {daypart.name}
                    </div>
                  </TableCell>
                  {daysOfWeek.map(day => {
                    const req = requirements.find(r => r.daypartId === daypart.id && r.day_of_week === day.value);
                    return (
                      <TableCell key={day.value} className="text-center">
                        {req ? (
                          <button
                            onClick={() => openDialog(req)}
                            className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            {req.targetHours}h
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                daypartId: daypart.id,
                                day_of_week: day.value.toString()
                              }));
                              setDialogOpen(true);
                            }}
                            className="px-2 py-1 rounded text-slate-400 text-sm hover:bg-slate-100 transition-colors"
                          >
                            —
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">
            <strong>Tip:</strong> Klik op een cel om de doeluren voor dat dagdeel en die dag in te stellen. 
            In het rooster zie je direct of je op schema ligt (groen), bijna (oranje) of eronder/boven zit (rood).
          </p>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedReq ? 'Bezettingsnorm bewerken' : 'Nieuwe bezettingsnorm'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daypartId">Dagdeel *</Label>
                <Select 
                  value={formData.daypartId} 
                  onValueChange={(v) => setFormData({ ...formData, daypartId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer dagdeel" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedDayparts.map(dp => (
                      <SelectItem key={dp.id} value={dp.id}>{dp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="day_of_week">Dag *</Label>
                <Select 
                  value={formData.day_of_week} 
                  onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer dag" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetHours">Doeluren *</Label>
              <Input
                id="targetHours"
                type="number"
                step="0.5"
                min="0"
                value={formData.targetHours}
                onChange={(e) => setFormData({ ...formData, targetHours: e.target.value })}
                placeholder="bijv. 8"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Totaal aantal te plannen uren voor dit dagdeel op deze dag
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_staff">Min. medewerkers</Label>
                <Input
                  id="min_staff"
                  type="number"
                  min="0"
                  value={formData.min_staff}
                  onChange={(e) => setFormData({ ...formData, min_staff: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="optimal_staff">Optimaal medewerkers</Label>
                <Input
                  id="optimal_staff"
                  type="number"
                  min="0"
                  value={formData.optimal_staff}
                  onChange={(e) => setFormData({ ...formData, optimal_staff: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="priority">Prioriteit</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Laag</SelectItem>
                  <SelectItem value="medium">Normaal</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="critical">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-4">
              {selectedReq && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleDelete(selectedReq)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Verwijderen
                </Button>
              )}
              <div className={`flex gap-3 ${!selectedReq ? 'ml-auto' : ''}`}>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {selectedReq ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}