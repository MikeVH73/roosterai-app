import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import EmployeeDialog from '@/components/employees/EmployeeDialog';
import EmployeeExport from '@/components/employees/EmployeeExport';
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Edit,
  Trash2,
  UserCircle,
  Filter,
  Building2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Card, CardContent } from "@/components/ui/card";
import { GlowCard } from "@/components/ui/glow-card";

export default function Employees() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  // Fetch functions
  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees', companyId]);
    }
  });

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      emp.departmentIds?.includes(departmentFilter);
    
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const getDepartmentNames = (ids) => {
    if (!ids?.length) return 'Geen afdeling';
    return ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
  };

  const getFunctionName = (id) => {
    return functions.find(f => f.id === id)?.name || 'Geen functie';
  };

  const contractTypeLabels = {
    fulltime: 'Fulltime',
    parttime: 'Parttime',
    flex: 'Flex',
    oproep: 'Oproepkracht',
    stagiair: 'Stagiair'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-600',
    on_leave: 'bg-amber-100 text-amber-700'
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = async (employee) => {
    if (window.confirm(`Weet je zeker dat je ${employee.first_name} ${employee.last_name} wilt verwijderen?`)) {
      await deleteMutation.mutateAsync(employee.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Medewerkers" 
        subtitle={`${employees.length} medewerkers`}
        actions={
          hasPermission('manage_schedules') && (
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Medewerker toevoegen
            </Button>
          )
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoek op naam, e-mail of personeelsnummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-3">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Afdeling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle afdelingen</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                    <SelectItem value="on_leave">Afwezig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Geen medewerkers gevonden</h3>
              <p className="text-slate-500 text-sm mb-6">
                {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
                  ? 'Pas je filters aan om medewerkers te vinden.'
                  : 'Voeg je eerste medewerker toe om te beginnen.'}
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Medewerker toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <GlowCard key={employee.id} glowColor="cyan">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <CardContent className="p-6" style={{ backgroundColor: 'transparent' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={employee.avatar_url} />
                          <AvatarFallback className="font-medium text-white" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {employee.first_name} {employee.last_name}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{getFunctionName(employee.functionId)}</p>
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
                          <DropdownMenuItem onClick={() => handleEdit(employee)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(employee)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                    <div className="space-y-2 mb-4">
                      {employee.email && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <Mail className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      {employee.phone && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <Phone className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="truncate">{getDepartmentNames(employee.departmentIds)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[employee.status]}>
                        {employee.status === 'active' ? 'Actief' : employee.status === 'inactive' ? 'Inactief' : 'Afwezig'}
                      </Badge>
                      <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {contractTypeLabels[employee.contract_type]}
                      </Badge>
                      {employee.contract_hours && (
                        <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{employee.contract_hours}u/week</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </GlowCard>
            ))}
          </div>
        )}
      </div>

      <EmployeeDialog 
        open={dialogOpen}
        onClose={handleDialogClose}
        employee={selectedEmployee}
        departments={departments}
        functions={functions}
      />
    </div>
  );
}