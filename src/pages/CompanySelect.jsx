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
import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";

export default function CompanySelect() {
  const navigate = useNavigate();
  const { currentCompany, userMemberships, selectCompany, loading } = useCompany();

  // Fetch company details for all memberships
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', userMemberships.map(m => m.companyId)],
    queryFn: async () => {
      if (userMemberships.length === 0) return [];
      const companyIds = userMemberships.map(m => m.companyId);
      const allCompanies = await base44.entities.Company.list();
      return allCompanies.filter(c => companyIds.includes(c.id));
    },
    enabled: userMemberships.length > 0
  });

  useEffect(() => {
    if (currentCompany) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [currentCompany, navigate]);

  const handleSelectCompany = async (companyId) => {
    await selectCompany(companyId);
    navigate(createPageUrl('Dashboard'));
  };

  const getMembershipRole = (companyId) => {
    const membership = userMemberships.find(m => m.companyId === companyId);
    return membership?.company_role;
  };

  const roleLabels = {
    company_admin: 'Administrator',
    planner: 'Planner',
    employee: 'Medewerker'
  };

  const planColors = {
    starter: 'bg-slate-100 text-slate-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700'
  };

  if (loading || isLoading) {
    return (
      <AuroraBackground>
        <div className="animate-pulse text-slate-400">Laden...</div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <motion.div 
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.2,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="w-full max-w-2xl px-6"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ShiftFlow</h1>
          <p className="text-slate-500">Selecteer een organisatie om door te gaan</p>
        </div>

        {/* Company List */}
        {companies.length > 0 ? (
          <div className="space-y-3 mb-8">
            {companies.map((company) => {
              const role = getMembershipRole(company.id);
              return (
                <Card 
                  key={company.id}
                  className="cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group"
                  onClick={() => handleSelectCompany(company.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl shrink-0">
                        {company.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={planColors[company.subscription_plan]}>
                            {company.subscription_plan?.charAt(0).toUpperCase() + company.subscription_plan?.slice(1)}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {roleLabels[role]}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-10 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Geen organisaties</h3>
              <p className="text-slate-500 text-sm mb-6">
                Je bent nog niet lid van een organisatie. Maak een nieuwe aan of vraag een uitnodiging.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create New Company */}
        <Button 
          onClick={() => navigate(createPageUrl('CompanyOnboarding'))}
          variant="outline"
          className="w-full h-14 border-dashed border-2 hover:border-blue-300 hover:bg-blue-50/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nieuwe organisatie aanmaken
        </Button>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-12">
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500">Slimme roostering</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500">AI-ondersteuning</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-slate-500">Team management</p>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}