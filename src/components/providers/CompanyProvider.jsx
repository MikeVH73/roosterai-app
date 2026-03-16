import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [userMemberships, setUserMemberships] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndCompanies();
  }, []);

  const loadUserAndCompanies = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Get all company memberships for this user (active or invited)
      const allMemberships = await base44.entities.CompanyMember.filter({
        email: currentUser.email
      });

      // Auto-activate any 'invited' memberships when the user actually logs in
      const invitedMemberships = allMemberships.filter(m => m.status === 'invited');
      for (const m of invitedMemberships) {
        await base44.entities.CompanyMember.update(m.id, {
          status: 'active',
          joined_at: new Date().toISOString()
        });
      }

      const memberships = allMemberships
        .filter(m => m.status === 'active' || m.status === 'invited')
        .map(m => m.status === 'invited' ? { ...m, status: 'active' } : m);
      
      setUserMemberships(memberships);
      
      // Check localStorage for saved company
      const savedCompanyId = localStorage.getItem('currentCompanyId');
      if (savedCompanyId) {
        const membership = memberships.find(m => m.companyId === savedCompanyId);
        if (membership) {
          const company = await base44.entities.Company.filter({ id: savedCompanyId });
          if (company.length > 0) {
            setCurrentCompany(company[0]);
            setUserRole(membership.company_role);
          }
        }
      } else if (memberships.length === 1) {
        // Auto-select if only one company
        const company = await base44.entities.Company.filter({ id: memberships[0].companyId });
        if (company.length > 0) {
          setCurrentCompany(company[0]);
          setUserRole(memberships[0].company_role);
          localStorage.setItem('currentCompanyId', company[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = async (companyId) => {
    const membership = userMemberships.find(m => m.companyId === companyId);
    if (!membership) return;
    
    const companies = await base44.entities.Company.filter({ id: companyId });
    if (companies.length > 0) {
      setCurrentCompany(companies[0]);
      setUserRole(membership.company_role);
      localStorage.setItem('currentCompanyId', companyId);
    }
  };

  const switchCompany = () => {
    setCurrentCompany(null);
    setUserRole(null);
    localStorage.removeItem('currentCompanyId');
  };

  const refreshCompany = async () => {
    if (currentCompany) {
      const companies = await base44.entities.Company.filter({ id: currentCompany.id });
      if (companies.length > 0) {
        setCurrentCompany(companies[0]);
      }
    }
  };

  const hasPermission = (permission) => {
    if (!userRole) return false;
    
    const permissions = {
      company_admin: ['manage_company', 'manage_users', 'manage_billing', 'manage_schedules', 'use_ai', 'view_reports', 'manage_requests'],
      planner: ['manage_schedules', 'use_ai', 'view_reports', 'manage_requests'],
      employee: ['view_schedule', 'submit_requests']
    };
    
    return permissions[userRole]?.includes(permission) || false;
  };

  const canUseAI = () => {
    if (!currentCompany) return false;
    const limit = currentCompany.ai_actions_limit || 300;
    const used = currentCompany.ai_actions_used || 0;
    return used < limit && hasPermission('use_ai');
  };

  const incrementAIUsage = async () => {
    if (!currentCompany) return;
    await base44.entities.Company.update(currentCompany.id, {
      ai_actions_used: (currentCompany.ai_actions_used || 0) + 1
    });
    await refreshCompany();
  };

  return (
    <CompanyContext.Provider value={{
      currentCompany,
      userMemberships,
      userRole,
      user,
      loading,
      selectCompany,
      switchCompany,
      refreshCompany,
      hasPermission,
      canUseAI,
      incrementAIUsage
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};