import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Users,
  MapPin,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const colorOptions = [
  { value: '#3B82F6', label: 'Blauw' },
  { value: '#10B981', label: 'Groen' },
  { value: '#8B5CF6', label: 'Paars' },
  { value: '#F59E0B', label: 'Oranje' },
  { value: '#EF4444', label: 'Rood' },
  { value: '#EC4899', label: 'Roze' },
  { value: '#06B6D4', label: 'Cyaan' },
  { value: '#6366F1', label: 'Indigo' },
];

export default function Departments() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    locationIds: [],
    status: 'active'
  });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments', companyId]);
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments', companyId]);
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments', companyId]);
    }
  });

  const handleOpenDialog = (department = null) => {
    if (department) {
      setSelectedDepartment(department);
      setFormData({
        name: department.name || '',
        code: department.code || '',
        description: department.description || '',
        color: department.color || '#3B82F6',
        locationIds: department.locationIds || [],
        status: department.status || 'active'
      });
    } else {
      setSelectedDepartment(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        color: '#3B82F6',
        locationIds: [],
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDepartment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData, companyId };

    if (selectedDepartment) {
      await updateMutation.mutateAsync({ id: selectedDepartment.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (department) => {
    if (window.confirm(`Weet je zeker dat je "${department.name}" wilt verwijderen?`)) {
      await deleteMutation.mutateAsync(department.id);
    }
  };

  const getEmployeeCount = (deptId) => {
    return employees.filter(e => e.departmentIds?.includes(deptId)).length;
  };

  const getLocationNames = (ids) => {
    if (!ids?.length) return [];
    return ids.map(id => locations.find(l => l.id === id)?.name).filter(Boolean);
  };

  const toggleLocation = (locId) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locId)
        ? prev.locationIds.filter(id => id !== locId)
        : [...prev.locationIds, locId]
    }));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Afdelingen" 
        subtitle={`${departments.length} afdelingen`}
        actions={
          hasPermission('manage_schedules') && (
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Afdeling toevoegen
            </Button>
          )
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Nog geen afdelingen</h3>
              <p className="text-slate-500 text-sm mb-6">
                Maak afdelingen aan om medewerkers te organiseren.
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste afdeling toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((department) => (
              <Card key={department.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${department.color}20` }}
                      >
                        <Building2 className="w-5 h-5" style={{ color: department.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{department.name}</h3>
                        {department.code && (
                          <p className="text-sm text-slate-500">{department.code}</p>
                        )}
                      </div>
                    </div>
                    {hasPermission('manage_schedules') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(department)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(department)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {department.description && (
                    <p className="text-sm text-slate-600 mb-4">{department.description}</p>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{getEmployeeCount(department.id)} medewerkers</span>
                    </div>
                  </div>

                  {department.locationIds?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {getLocationNames(department.locationIds).map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDepartment ? 'Afdeling bewerken' : 'Nieuwe afdeling'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="bijv. VK, LOG"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Beschrijving</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Kleur</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            {locations.length > 0 && (
              <div>
                <Label>Locaties</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`loc-${loc.id}`}
                        checked={formData.locationIds.includes(loc.id)}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <Label htmlFor={`loc-${loc.id}`} className="text-sm font-normal cursor-pointer">
                        {loc.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedDepartment ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}