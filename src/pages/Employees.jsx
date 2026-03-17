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
  Edit,
  Trash2,
  UserCircle,
  Filter,
  Building2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X
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
import { useTheme } from '@/components/providers/ThemeProvider';

export default function Employees() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [contractTypeFilter, setContractTypeFilter] = useState('all');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
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

  // Filter + sort employees
  const filteredEmployees = employees
    .filter(emp => {
      const matchesSearch = 
        emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || emp.departmentIds?.includes(departmentFilter);
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesContractType = contractTypeFilter === 'all' || emp.contract_type === contractTypeFilter;
      const matchesFunction = functionFilter === 'all' || emp.functionId === functionFilter;
      return matchesSearch && matchesDepartment && matchesStatus && matchesContractType && matchesFunction;
    })
    .sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortField === 'last_name') { aVal = `${a.last_name} ${a.first_name}`; bVal = `${b.last_name} ${b.first_name}`; }
      else if (sortField === 'contract_hours') { aVal = a.contract_hours || 0; bVal = b.contract_hours || 0; return sortDir === 'asc' ? aVal - bVal : bVal - aVal; }
      else if (sortField === 'status') { aVal = a.status || ''; bVal = b.status || ''; }
      else if (sortField === 'contract_type') { aVal = a.contract_type || ''; bVal = b.contract_type || ''; }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-400" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-500" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-500" />;
  };

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

  const statusStyles = {
    active: { backgroundColor: '#065f46', color: '#6ee7b7' },
    inactive: { backgroundColor: '#334155', color: '#94a3b8' },
    on_leave: { backgroundColor: '#78350f', color: '#fcd34d' },
  };
  const statusStylesLight = {
    active: { backgroundColor: '#dcfce7', color: '#166534' },
    inactive: { backgroundColor: '#f1f5f9', color: '#475569' },
    on_leave: { backgroundColor: '#fef3c7', color: '#92400e' },
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

  const activeFilters = [
    departmentFilter !== 'all' && { label: departments.find(d => d.id === departmentFilter)?.name, clear: () => setDepartmentFilter('all') },
    statusFilter !== 'all' && { label: statusFilter === 'active' ? 'Actief' : statusFilter === 'inactive' ? 'Inactief' : 'Afwezig', clear: () => setStatusFilter('all') },
    contractTypeFilter !== 'all' && { label: contractTypeLabels[contractTypeFilter], clear: () => setContractTypeFilter('all') },
    functionFilter !== 'all' && { label: functions.find(f => f.id === functionFilter)?.name, clear: () => setFunctionFilter('all') },
  ].filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Medewerkers" 
        subtitle={`${filteredEmployees.length} van ${employees.length} medewerkers`}
        actions={
          hasPermission('manage_schedules') && (
            <div className="flex gap-2">
              <EmployeeExport employees={employees} departments={departments} functions={functions} />
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Medewerker toevoegen
              </Button>
            </div>
          )
        }
      />

      <div className="p-6" style={{ maxWidth: '100%' }}>
        {/* Filters */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoek op naam, e-mail of personeelsnummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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
              <Select value={functionFilter} onValueChange={setFunctionFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Functie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle functies</SelectItem>
                  {functions.map(fn => (
                    <SelectItem key={fn.id} value={fn.id}>{fn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Contract" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle contracten</SelectItem>
                  {Object.entries(contractTypeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
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
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeFilters.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={f.clear}>
                    {f.label}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                <button className="text-xs text-blue-500 hover:underline" onClick={() => { setDepartmentFilter('all'); setStatusFilter('all'); setContractTypeFilter('all'); setFunctionFilter('all'); setSearchQuery(''); }}>
                  Alles wissen
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }} />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Geen medewerkers gevonden</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {searchQuery || activeFilters.length > 0 ? 'Pas je filters aan.' : 'Voeg je eerste medewerker toe.'}
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Medewerker toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => handleSort('last_name')}>
                    <span className="flex items-center" style={{ color: 'var(--color-text-secondary)' }}>Naam <SortIcon field="last_name" /></span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Personeelsnr.</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>E-mail</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Telefoon</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Functie</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Afdelingen</th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => handleSort('contract_type')}>
                    <span className="flex items-center" style={{ color: 'var(--color-text-secondary)' }}>Contract <SortIcon field="contract_type" /></span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => handleSort('contract_hours')}>
                    <span className="flex items-center" style={{ color: 'var(--color-text-secondary)' }}>Uren/wk <SortIcon field="contract_hours" /></span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <span className="flex items-center" style={{ color: 'var(--color-text-secondary)' }}>Status <SortIcon field="status" /></span>
                  </th>
                  {hasPermission('manage_schedules') && (
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-text-secondary)' }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, idx) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-opacity-50 transition-colors"
                    style={{
                      borderBottom: idx < filteredEmployees.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-light)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={employee.avatar_url} />
                          <AvatarFallback className="text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                          {employee.last_name}, {employee.first_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{employee.employee_number || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{employee.email || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{employee.phone || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{getFunctionName(employee.functionId)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)', maxWidth: '220px' }}>
                      <span className="truncate block" title={getDepartmentNames(employee.departmentIds)}>
                        {getDepartmentNames(employee.departmentIds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {contractTypeLabels[employee.contract_type] || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {employee.contract_hours ? `${employee.contract_hours}u` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={theme === 'dark' ? statusStyles[employee.status] : statusStylesLight[employee.status]}>
                        {employee.status === 'active' ? 'Actief' : employee.status === 'inactive' ? 'Inactief' : 'Afwezig'}
                      </Badge>
                    </td>
                    {hasPermission('manage_schedules') && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit className="w-4 h-4 mr-2" />Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(employee)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EmployeeDialog 
        open={dialogOpen}
        onClose={handleDialogClose}
        employee={selectedEmployee}
        departments={departments}
        functions={functions}
        employeeCount={employees.filter(e => e.status === 'active').length}
      />
    </div>
  );
}