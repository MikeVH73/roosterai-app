import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import DaypartManager from '@/components/departments/DaypartManager';
import StaffingRequirementsManager from '@/components/departments/StaffingRequirementsManager';
import {
  ArrowLeft,
  Building2,
  Users,
  Clock,
  Target,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DepartmentDetails() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const departmentId = urlParams.get('id');

  const { data: department, isLoading: deptLoading } = useQuery({
    queryKey: ['department', departmentId],
    queryFn: async () => {
      const depts = await base44.entities.Department.filter({ companyId });
      return depts.find(d => d.id === departmentId);
    },
    enabled: !!departmentId && !!companyId
  });

  const { data: dayparts = [], isLoading: daypartsLoading } = useQuery({
    queryKey: ['dayparts', companyId, departmentId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId, departmentId }),
    enabled: !!companyId && !!departmentId
  });

  const { data: staffingRequirements = [] } = useQuery({
    queryKey: ['staffing-requirements', companyId, departmentId],
    queryFn: () => base44.entities.StaffingRequirement.filter({ companyId, departmentId }),
    enabled: !!companyId && !!departmentId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  const handleDaypartUpdate = () => {
    queryClient.invalidateQueries(['dayparts', companyId, departmentId]);
  };

  const handleRequirementsUpdate = () => {
    queryClient.invalidateQueries(['staffing-requirements', companyId, departmentId]);
  };

  const employeeCount = employees.filter(e => e.departmentIds?.includes(departmentId)).length;

  if (deptLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Afdeling niet gevonden</h3>
            <Button onClick={() => navigate('/Departments')}>
              Terug naar afdelingen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title={department.name}
        subtitle="Afdelingsinstellingen"
        actions={
          <Button variant="ghost" onClick={() => navigate('/Departments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        {/* Overview Card */}
        <Card className="border-0 shadow-sm mb-6" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${department.color}20` }}
              >
                <Building2 className="w-7 h-7" style={{ color: department.color }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{department.name}</h2>
                {department.description && (
                  <p style={{ color: 'var(--color-text-muted)' }}>{department.description}</p>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Medewerkers</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{employeeCount}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Dagdelen</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dayparts.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="dayparts">
          <TabsList className="mb-6">
            <TabsTrigger value="dayparts" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dagdelen
            </TabsTrigger>
            <TabsTrigger value="staffing" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Bezettingsnormen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dayparts">
            <DaypartManager 
              departmentId={departmentId}
              dayparts={dayparts}
              onUpdate={handleDaypartUpdate}
            />
          </TabsContent>

          <TabsContent value="staffing">
            <StaffingRequirementsManager
              departmentId={departmentId}
              dayparts={dayparts}
              requirements={staffingRequirements}
              onUpdate={handleRequirementsUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}