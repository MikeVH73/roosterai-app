import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

const requestTypes = [
  { value: 'vacation', label: 'Vakantie' },
  { value: 'sick', label: 'Ziekte' },
  { value: 'personal', label: 'Persoonlijk' },
  { value: 'unpaid', label: 'Onbetaald verlof' },
  { value: 'parental', label: 'Ouderschapsverlof' },
  { value: 'other', label: 'Anders' },
];

const statusConfig = {
  pending: { label: 'In afwachting', style: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }, icon: Clock },
  approved: { label: 'Goedgekeurd', style: { backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80' }, icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', style: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }, icon: XCircle },
  cancelled: { label: 'Geannuleerd', style: { backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8' }, icon: XCircle }
};

export default function VacationRequests() {
  const { currentCompany, hasPermission, user } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: 'vacation',
    reason: ''
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['vacation-requests', companyId],
    queryFn: () => base44.entities.VacationRequest.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', companyId, user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId, email: user?.email });
      return profiles[0];
    },
    enabled: !!companyId && !!user?.email
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VacationRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vacation-requests', companyId]);
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VacationRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vacation-requests', companyId]);
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({
      start_date: '',
      end_date: '',
      type: 'vacation',
      reason: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      companyId,
      employeeId: myProfile?.id
    });
  };

  const handleApprove = async (request) => {
    await updateMutation.mutateAsync({
      id: request.id,
      data: {
        status: 'approved',
        reviewed_by: myProfile?.id,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleReject = async (request) => {
    await updateMutation.mutateAsync({
      id: request.id,
      data: {
        status: 'rejected',
        reviewed_by: myProfile?.id,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const getEmployee = (id) => employees.find(e => e.id === id);

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const filteredRequests = requests.filter(r => 
    statusFilter === 'all' || r.status === statusFilter
  ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const myRequests = requests.filter(r => r.employeeId === myProfile?.id);

  const isSubmitting = createMutation.isPending;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Verlofaanvragen" 
        subtitle={`${requests.filter(r => r.status === 'pending').length} openstaand`}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Verlof aanvragen
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue={hasPermission('manage_requests') ? 'all' : 'mine'}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="mine">Mijn aanvragen</TabsTrigger>
              {hasPermission('manage_requests') && (
                <TabsTrigger value="all">Alle aanvragen</TabsTrigger>
              )}
            </TabsList>

            {hasPermission('manage_requests') && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="pending">In afwachting</SelectItem>
                  <SelectItem value="approved">Goedgekeurd</SelectItem>
                  <SelectItem value="rejected">Afgewezen</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="mine">
            {myRequests.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-medium text-slate-900 mb-2">Geen verlofaanvragen</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Je hebt nog geen verlof aangevraagd.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Verlof aanvragen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRequests.map((request) => {
                  const StatusIcon = statusConfig[request.status].icon;
                  const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                  return (
                    <Card key={request.id} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge style={statusConfig[request.status].style}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig[request.status].label}
                                </Badge>
                                <Badge variant="outline">
                                  {requestTypes.find(t => t.value === request.type)?.label}
                                </Badge>
                              </div>
                              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {format(parseISO(request.start_date), 'd MMM', { locale: nl })} - {format(parseISO(request.end_date), 'd MMM yyyy', { locale: nl })}
                                <span className="text-slate-500 font-normal ml-2">({days} dagen)</span>
                              </p>
                              {request.reason && (
                                <p className="text-sm text-slate-500 mt-1">{request.reason}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {hasPermission('manage_requests') && (
            <TabsContent value="all">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="border-0 shadow-sm animate-pulse">
                      <CardContent className="p-5">
                        <div className="h-12 bg-slate-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-medium text-slate-900 mb-2">Geen aanvragen</h3>
                    <p className="text-slate-500 text-sm">
                      Er zijn geen verlofaanvragen met deze status.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => {
                    const employee = getEmployee(request.employeeId);
                    const StatusIcon = statusConfig[request.status].icon;
                    const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                    
                    return (
                      <Card key={request.id} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                                  {getInitials(employee?.first_name, employee?.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-slate-900">
                                    {employee?.first_name} {employee?.last_name}
                                  </span>
                                  <Badge style={statusConfig[request.status].style}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig[request.status].label}
                                  </Badge>
                                  <Badge variant="outline">
                                    {requestTypes.find(t => t.value === request.type)?.label}
                                  </Badge>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                  {format(parseISO(request.start_date), 'd MMM', { locale: nl })} - {format(parseISO(request.end_date), 'd MMM yyyy', { locale: nl })}
                                  <span className="text-slate-400 ml-2">({days} dagen)</span>
                                </p>
                                {request.reason && (
                                  <p className="text-sm text-slate-500 mt-1">{request.reason}</p>
                                )}
                              </div>
                            </div>

                            {request.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleApprove(request)}
                                  disabled={updateMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Goedkeuren
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(request)}
                                  disabled={updateMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Afwijzen
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verlof aanvragen</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type">Type verlof</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Startdatum *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">Einddatum *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Eventuele toelichting..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aanvragen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}