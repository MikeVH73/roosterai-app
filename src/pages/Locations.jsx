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
  MapPin,
  Phone,
  Users,
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

const locationTypes = [
  { value: 'office', label: 'Kantoor' },
  { value: 'warehouse', label: 'Magazijn' },
  { value: 'store', label: 'Winkel' },
  { value: 'hospital', label: 'Ziekenhuis' },
  { value: 'clinic', label: 'Kliniek' },
  { value: 'home_care', label: 'Thuiszorg' },
  { value: 'other', label: 'Anders' },
];

export default function Locations() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location_type: 'office',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    capacity: '',
    status: 'active'
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations', companyId]);
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations', companyId]);
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations', companyId]);
    }
  });

  const handleOpenDialog = (location = null) => {
    if (location) {
      setSelectedLocation(location);
      setFormData({
        name: location.name || '',
        code: location.code || '',
        location_type: location.location_type || 'office',
        address: location.address || '',
        city: location.city || '',
        postal_code: location.postal_code || '',
        phone: location.phone || '',
        capacity: location.capacity?.toString() || '',
        status: location.status || 'active'
      });
    } else {
      setSelectedLocation(null);
      setFormData({
        name: '',
        code: '',
        location_type: 'office',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        capacity: '',
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLocation(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { 
      ...formData, 
      companyId,
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    };

    if (selectedLocation) {
      await updateMutation.mutateAsync({ id: selectedLocation.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (location) => {
    if (window.confirm(`Weet je zeker dat je "${location.name}" wilt verwijderen?`)) {
      await deleteMutation.mutateAsync(location.id);
    }
  };

  const getTypeLabel = (type) => {
    return locationTypes.find(t => t.value === type)?.label || type;
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Locaties" 
        subtitle={`${locations.length} locaties`}
        actions={
          hasPermission('manage_schedules') && (
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Locatie toevoegen
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
        ) : locations.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Nog geen locaties</h3>
              <p className="text-slate-500 text-sm mb-6">
                Voeg locaties toe waar je medewerkers werken.
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste locatie toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <Card key={location.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{location.name}</h3>
                        {location.code && (
                          <p className="text-sm text-slate-500">{location.code}</p>
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(location)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(location)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <Badge variant="secondary" className="mb-4">
                    {getTypeLabel(location.location_type)}
                  </Badge>

                  <div className="space-y-2 text-sm text-slate-600">
                    {(location.address || location.city) && (
                      <p>
                        {location.address}
                        {location.address && location.city && ', '}
                        {location.city}
                        {location.postal_code && ` ${location.postal_code}`}
                      </p>
                    )}
                    {location.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{location.phone}</span>
                      </div>
                    )}
                    {location.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Max {location.capacity} medewerkers</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedLocation ? 'Locatie bewerken' : 'Nieuwe locatie'}
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
                  placeholder="bijv. HQ, WH1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location_type">Type</Label>
              <Select 
                value={formData.location_type} 
                onValueChange={(v) => setFormData({ ...formData, location_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Straatnaam 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code">Postcode</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="1234 AB"
                />
              </div>
              <div>
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capaciteit</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Max medewerkers"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedLocation ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}