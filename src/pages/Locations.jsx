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

export default function Locations() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    locationTypeId: '',
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

  const { data: locationTypes = [] } = useQuery({
    queryKey: ['location-types', companyId],
    queryFn: () => base44.entities.LocationType.filter({ companyId, status: 'active' }),
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
        locationTypeId: location.locationTypeId || '',
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
        locationTypeId: '',
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

  const getTypeName = (typeId) => {
    const type = locationTypes.find(t => t.id === typeId);
    return type?.name || 'Geen type';
  };

  const getTypeColor = (typeId) => {
    const type = locationTypes.find(t => t.id === typeId);
    return type?.color || '#6B7280';
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
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
              <Card key={i} className="border-0 shadow-sm animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }}>
                <CardContent className="p-6">
                  <div className="h-6 rounded w-3/4 mb-4" style={{ backgroundColor: 'var(--color-surface-light)' }} />
                  <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'var(--color-surface-light)' }} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
              <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Nog geen locaties</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
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
              <Card key={location.id} className="border-0 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${getTypeColor(location.locationTypeId)}20` }}
                      >
                        <MapPin className="w-5 h-5" style={{ color: getTypeColor(location.locationTypeId) }} />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{location.name}</h3>
                        {location.code && (
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{location.code}</p>
                        )}
                      </div>
                    </div>
                    {hasPermission('manage_schedules') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" style={{ color: 'var(--color-text-muted)' }}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                          <DropdownMenuItem onClick={() => handleOpenDialog(location)} style={{ color: 'var(--color-text-primary)' }}>
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

                  <Badge 
                    variant="secondary" 
                    className="mb-4"
                    style={{ 
                      backgroundColor: `${getTypeColor(location.locationTypeId)}20`,
                      color: getTypeColor(location.locationTypeId)
                    }}
                  >
                    {getTypeName(location.locationTypeId)}
                  </Badge>

                  <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
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
                        <Phone className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        <span>{location.phone}</span>
                      </div>
                    )}
                    {location.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
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
              <Label htmlFor="locationTypeId">Type</Label>
              <Select 
                value={formData.locationTypeId} 
                onValueChange={(v) => setFormData({ ...formData, locationTypeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een type" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.length === 0 ? (
                    <SelectItem value={null} disabled>Geen types beschikbaar</SelectItem>
                  ) : (
                    locationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  )}
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