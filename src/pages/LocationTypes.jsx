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
  Archive,
  MapPin,
  Loader2,
  AlertTriangle,
  RefreshCw
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
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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

export default function LocationTypes() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [replacementTypeId, setReplacementTypeId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    status: 'active'
  });

  const { data: locationTypes = [], isLoading } = useQuery({
    queryKey: ['location-types', companyId],
    queryFn: () => base44.entities.LocationType.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LocationType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['location-types', companyId]);
      closeDialog();
      toast.success('Locatie type aangemaakt');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LocationType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['location-types', companyId]);
      closeDialog();
      toast.success('Locatie type bijgewerkt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LocationType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['location-types', companyId]);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
      toast.success('Locatie type verwijderd');
    }
  });

  const replaceAndDeleteMutation = useMutation({
    mutationFn: async ({ typeToDeleteId, replacementId }) => {
      // Update all locations using this type
      const locationsToUpdate = locations.filter(l => l.locationTypeId === typeToDeleteId);
      for (const loc of locationsToUpdate) {
        await base44.entities.Location.update(loc.id, { locationTypeId: replacementId });
      }
      // Then delete the type
      await base44.entities.LocationType.delete(typeToDeleteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['location-types', companyId]);
      queryClient.invalidateQueries(['locations', companyId]);
      setReplaceDialogOpen(false);
      setTypeToDelete(null);
      setReplacementTypeId('');
      toast.success('Locatie type vervangen en verwijderd');
    }
  });

  const openDialog = (type = null) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        name: type.name || '',
        code: type.code || '',
        description: type.description || '',
        color: type.color || '#3B82F6',
        status: type.status || 'active'
      });
    } else {
      setSelectedType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        color: '#3B82F6',
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData, companyId };

    if (selectedType) {
      await updateMutation.mutateAsync({ id: selectedType.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = (type) => {
    const usageCount = locations.filter(l => l.locationTypeId === type.id).length;
    setTypeToDelete(type);
    
    if (usageCount > 0) {
      setReplaceDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleArchive = async (type) => {
    await updateMutation.mutateAsync({
      id: type.id,
      data: { status: 'archived' }
    });
  };

  const getUsageCount = (typeId) => {
    return locations.filter(l => l.locationTypeId === typeId).length;
  };

  const activeTypes = locationTypes.filter(t => t.status === 'active');
  const archivedTypes = locationTypes.filter(t => t.status === 'archived');

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Locatie Types" 
        subtitle={`${activeTypes.length} actieve types`}
        actions={
          hasPermission('manage_schedules') && (
            <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Type toevoegen
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
        ) : locationTypes.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Nog geen locatie types</h3>
              <p className="text-slate-500 text-sm mb-6">
                Maak locatie types aan om locaties te categoriseren.
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste type toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active Types */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actieve types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTypes.map((type) => {
                  const usageCount = getUsageCount(type.id);
                  return (
                    <Card key={type.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${type.color}20` }}
                            >
                              <MapPin className="w-5 h-5" style={{ color: type.color }} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{type.name}</h3>
                              {type.code && (
                                <p className="text-sm text-slate-500">{type.code}</p>
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
                                <DropdownMenuItem onClick={() => openDialog(type)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Bewerken
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(type)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archiveren
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(type)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Verwijderen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {type.description && (
                          <p className="text-sm text-slate-600 mb-4">{type.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">
                            {usageCount} {usageCount === 1 ? 'locatie' : 'locaties'}
                          </span>
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Archived Types */}
            {archivedTypes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-500 mb-4">Gearchiveerd</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedTypes.map((type) => (
                    <Card key={type.id} className="border-0 shadow-sm opacity-60">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-600">{type.name}</h3>
                              <Badge variant="secondary">Gearchiveerd</Badge>
                            </div>
                          </div>
                          {hasPermission('manage_schedules') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: type.id, data: { status: 'active' } })}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Herstellen
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedType ? 'Locatie type bewerken' : 'Nieuw locatie type'}
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
                  placeholder="bijv. OFF, WH"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedType ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Simple Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locatie type verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{typeToDelete?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(typeToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace and Delete Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Type wordt nog gebruikt
            </DialogTitle>
            <DialogDescription>
              "{typeToDelete?.name}" wordt gebruikt door {getUsageCount(typeToDelete?.id)} locatie(s). 
              Kies een vervangend type voordat je dit type verwijdert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Vervangen door</Label>
              <Select value={replacementTypeId} onValueChange={setReplacementTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een type" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.filter(t => t.id !== typeToDelete?.id).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setReplaceDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={() => replaceAndDeleteMutation.mutate({ 
                  typeToDeleteId: typeToDelete?.id, 
                  replacementId: replacementTypeId 
                })}
                disabled={!replacementTypeId || replaceAndDeleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {replaceAndDeleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vervangen en verwijderen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}