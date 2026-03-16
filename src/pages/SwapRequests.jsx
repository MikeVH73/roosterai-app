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
  ArrowLeftRight,
  Filter,
  Loader2,
  Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

const swapTypes = [
  { value: 'swap', label: 'Ruilen' },
  { value: 'give_away', label: 'Weggeven' },
  { value: 'take_over', label: 'Overnemen' },
];

const statusConfig = {
  pending: { label: 'In afwachting', color: 'bg-amber-100 text-amber-700', icon: Clock },
  accepted_by_colleague: { label: 'Geaccepteerd door collega', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  approved: { label: 'Goedgekeurd', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Geannuleerd', color: 'bg-slate-100 text-slate-500', icon: XCircle }
};

export default function SwapRequests() {
  const { currentCompany, hasPermission, user } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [formData, setFormData] = useState({
    shiftId: '',
    targetEmployeeId: '',
    swap_type: 'swap',
    reason: ''
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['swap-requests', companyId],
    queryFn: () => base44.entities.SwapRequest.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
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
    mutationFn: (data) => base44.entities.SwapRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['swap-requests', companyId]);
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SwapRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['swap-requests', companyId]);
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({
      shiftId: '',
      targetEmployeeId: '',
      swap_type: 'swap',
      reason: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      companyId,
      requesterId: myProfile?.id,
      targetEmployeeId: formData.targetEmployeeId || null
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
  const getShift = (id) => shifts.find(s => s.id === id);

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const myShifts = shifts.filter(s => s.employeeId === myProfile?.id);
  const filteredRequests = requests.filter(r => 
    statusFilter === 'all' || r.status === statusFilter
  ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const myRequests = requests.filter(r => r.requesterId === myProfile?.id);

  const isSubmitting = createMutation.isPending;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Ruilverzoeken" 
        subtitle={`${requests.filter(r => r.status === 'pending').length} openstaand`}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Ruilverzoek indienen
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue={hasPermission('manage_requests') ? 'all' : 'mine'}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="mine">Mijn verzoeken</TabsTrigger>
              {hasPermission('manage_requests') && (
                <TabsTrigger value="all">Alle verzoeken</TabsTrigger>
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
                  <SelectItem value="accepted_by_colleague">Geaccepteerd</SelectItem>
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
                  <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-medium text-slate-900 mb-2">Geen ruilverzoeken</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Je hebt nog geen ruilverzoeken ingediend.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ruilverzoek indienen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRequests.map((request) => {
                  const shift = getShift(request.shiftId);
                  const targetEmployee = request.targetEmployeeId ? getEmployee(request.targetEmployeeId) : null;
                  const StatusIcon = statusConfig[request.status].icon;
                  
                  return (
                    <Card key={request.id} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                              <ArrowLeftRight className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={statusConfig[request.status].color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig[request.status].label}
                                </Badge>
                                <Badge variant="outline">
                                  {swapTypes.find(t => t.value === request.swap_type)?.label}
                                </Badge>
                              </div>
                              {shift && (
                                <p className="font-medium text-slate-900">
                                  {format(parseISO(shift.date), 'EEEE d MMMM yyyy', { locale: nl })}
                                  <span className="text-slate-500 font-normal ml-2">
                                    {shift.start_time} - {shift.end_time}
                                  </span>
                                </p>
                              )}
                              {targetEmployee && (
                                <p className="text-sm text-slate-500 mt-1">
                                  Met: {targetEmployee.first_name} {targetEmployee.last_name}
                                </p>
                              )}
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
                    <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-medium text-slate-900 mb-2">Geen verzoeken</h3>
                    <p className="text-slate-500 text-sm">
                      Er zijn geen ruilverzoeken met deze status.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => {
                    const requester = getEmployee(request.requesterId);
                    const shift = getShift(request.shiftId);
                    const targetEmployee = request.targetEmployeeId ? getEmployee(request.targetEmployeeId) : null;
                    const StatusIcon = statusConfig[request.status].icon;
                    
                    return (
                      <Card key={request.id} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                                  {getInitials(requester?.first_name, requester?.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-slate-900">
                                    {requester?.first_name} {requester?.last_name}
                                  </span>
                                  <Badge className={statusConfig[request.status].color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig[request.status].label}
                                  </Badge>
                                  <Badge variant="outline">
                                    {swapTypes.find(t => t.value === request.swap_type)?.label}
                                  </Badge>
                                </div>
                                {shift && (
                                  <p className="text-sm text-slate-600">
                                    {format(parseISO(shift.date), 'EEEE d MMMM yyyy', { locale: nl })}
                                    <span className="text-slate-400 ml-2">
                                      {shift.start_time} - {shift.end_time}
                                    </span>
                                  </p>
                                )}
                                {targetEmployee && (
                                  <p className="text-sm text-slate-500 mt-1">
                                    Met: {targetEmployee.first_name} {targetEmployee.last_name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(request.status === 'pending' || request.status === 'accepted_by_colleague') && (
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
            <DialogTitle>Ruilverzoek indienen</DialogTitle>
            <DialogDescription>
              Selecteer een dienst die je wilt ruilen of weggeven.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="shiftId">Dienst *</Label>
              <Select 
                value={formData.shiftId} 
                onValueChange={(v) => setFormData({ ...formData, shiftId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een dienst" />
                </SelectTrigger>
                <SelectContent>
                  {myShifts.length === 0 ? (
                    <SelectItem value={null} disabled>Geen diensten gevonden</SelectItem>
                  ) : (
                    myShifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {format(parseISO(shift.date), 'EEE d MMM', { locale: nl })} {shift.start_time} - {shift.end_time}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="swap_type">Type</Label>
              <Select 
                value={formData.swap_type} 
                onValueChange={(v) => setFormData({ ...formData, swap_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {swapTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="targetEmployeeId">Met collega (optioneel)</Label>
              <Select 
                value={formData.targetEmployeeId} 
                onValueChange={(v) => setFormData({ ...formData, targetEmployeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Iedereen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Iedereen (open verzoek)</SelectItem>
                  {employees.filter(e => e.id !== myProfile?.id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Waarom wil je deze dienst ruilen?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.shiftId} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Indienen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}