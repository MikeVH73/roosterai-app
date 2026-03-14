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
    enabled: !!departmentId
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Afdeling niet gevonden</h3>
            <Button onClick={() => navigate('/Departments')}>
              Terug naar afdelingen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${department.color}20` }}
              >
                <Building2 className="w-7 h-7" style={{ color: department.color }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900">{department.name}</h2>
                {department.description && (
                  <p className="text-slate-500">{department.description}</p>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Medewerkers</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{employeeCount}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Dagdelen</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{dayparts.length}</p>
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