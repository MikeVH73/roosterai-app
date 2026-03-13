import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, ChevronRight, Users, Calendar, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CompanySelect() {
  const navigate = useNavigate();
  const { currentCompany, userMemberships, selectCompany, loading } = useCompany();

  // Fetch company details for all memberships
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', userMemberships.map((m) => m.companyId)],
    queryFn: async () => {
      if (userMemberships.length === 0) return [];
      const companyIds = userMemberships.map((m) => m.companyId);
      const allCompanies = await base44.entities.Company.list();
      return allCompanies.filter((c) => companyIds.includes(c.id));
    },
    enabled: userMemberships.length > 0
  });



  const handleSelectCompany = async (companyId) => {
    await selectCompany(companyId);
    navigate(createPageUrl('Dashboard'));
  };

  const getMembershipRole = (companyId) => {
    const membership = userMemberships.find((m) => m.companyId === companyId);
    return membership?.company_role;
  };

  const roleLabels = {
    company_admin: 'Administrator',
    planner: 'Planner',
    employee: 'Medewerker'
  };

  const planColors = {
    starter: 'bg-slate-100 text-slate-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-violet-100 text-violet-700'
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-300">Laden...</div>
      </div>);

  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #1e1b2e 0%, #262344 50%, #2d2a3e 100%)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)' }}>
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold" style={{ color: '#ffffff' }}>RoosterAI</h1>
          <p className="text-slate-300">Selecteer een organisatie om door te gaan</p>
        </div>

        {/* Company List */}
        {companies.length > 0 ?
        <div className="space-y-3 mb-8">
            {companies.map((company) => {
            const role = getMembershipRole(company.id);
            return (
              <Card
                key={company.id}
                className="cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all group border-slate-700"
                style={{ backgroundColor: '#1e293b' }}
                onClick={() => handleSelectCompany(company.id)}>

                  <CardContent className="p-5" style={{ backgroundColor: 'transparent' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)' }}>
                        {company.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg" style={{ color: '#ffffff' }}>
                          {company.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={planColors[company.subscription_plan]}>
                            {company.subscription_plan?.charAt(0).toUpperCase() + company.subscription_plan?.slice(1)}
                          </Badge>
                          <span className="text-sm text-slate-400">
                            {roleLabels[role]}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>);

          })}
          </div> :

        <Card className="mb-8 bg-slate-800/50 border-slate-700">
            <CardContent className="p-10 text-center" style={{ backgroundColor: 'transparent' }}>
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="font-medium mb-2 text-white">Geen organisaties</h3>
              <p className="text-sm mb-6 text-slate-300">
                Je bent nog niet lid van een organisatie. Maak een nieuwe aan of vraag een uitnodiging.
              </p>
            </CardContent>
          </Card>
        }

        {/* Create New Company */}
        <Button
          onClick={() => navigate(createPageUrl('CompanyOnboarding'))}
          className="w-full h-14"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#ffffff', border: 'none' }}>

          <Plus className="w-5 h-5 mr-2" />
          Nieuwe organisatie aanmaken
        </Button>

        {/* Logout */}
        <div className="text-center mt-6">
          <button
            onClick={() => base44.auth.logout()}
            className="text-sm underline text-slate-400 hover:text-slate-300">
            Uitloggen
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-12">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">Slimme roostering</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">AI-ondersteuning</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">Team management</p>
          </div>
        </div>
      </div>
    </div>);

}