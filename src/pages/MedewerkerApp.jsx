import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileHomeTab from '@/components/mobile/MobileHomeTab';
import MobileRoosterTab from '@/components/mobile/MobileRoosterTab';
import MobileChatTab from '@/components/mobile/MobileChatTab';
import MobileMeldingenTab from '@/components/mobile/MobileMeldingenTab';
import MobileProfielTab from '@/components/mobile/MobileProfielTab';
import MobileVerlofTab from '@/components/mobile/MobileVerlofTab';
import MobileRuilTab from '@/components/mobile/MobileRuilTab';

const headerTitles = {
  home: 'Dashboard',
  rooster: 'Mijn Rooster',
  chat: 'Planning Assistent',
  meldingen: 'Meldingen',
  profiel: 'Profiel',
  verlof: 'Verlofaanvragen',
  ruil: 'Ruilverzoeken',
};

export default function MedewerkerApp() {
  const { currentCompany, user } = useCompany();
  const companyId = currentCompany?.id;
  const [activeTab, setActiveTab] = useState('home');

  // Data queries
  const { data: myProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile', companyId, user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId, email: user?.email });
      return profiles[0] || null;
    },
    enabled: !!companyId && !!user?.email,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['my-all-shifts', companyId, myProfile?.id],
    queryFn: () => base44.entities.Shift.filter({ companyId, employeeId: myProfile.id }),
    enabled: !!companyId && !!myProfile?.id,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId }),
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: vacationRequests = [] } = useQuery({
    queryKey: ['vacation-requests', companyId],
    queryFn: () => base44.entities.VacationRequest.filter({ companyId }),
    enabled: !!companyId,
  });

  const { data: swapRequests = [] } = useQuery({
    queryKey: ['swap-requests', companyId],
    queryFn: () => base44.entities.SwapRequest.filter({ companyId }),
    enabled: !!companyId,
  });

  const { data: messageLogs = [] } = useQuery({
    queryKey: ['my-messages', companyId, myProfile?.id],
    queryFn: () => base44.entities.WhatsAppMessageLog.filter({ companyId, employee_id: myProfile.id }),
    enabled: !!companyId && !!myProfile?.id,
    refetchInterval: 15000,
  });

  // Count unread notifications
  const unreadMessages = messageLogs.filter(m => m.direction === 'outbound' && !m.read).length;

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  const navigate = (tab) => setActiveTab(tab);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <MobileHomeTab
            shifts={shifts}
            myProfile={myProfile}
            vacationRequests={vacationRequests}
            swapRequests={swapRequests}
            locations={locations}
            departments={departments}
            dayparts={dayparts}
            onNavigate={navigate}
          />
        );
      case 'rooster':
        return (
          <MobileRoosterTab
            shifts={shifts}
            locations={locations}
            departments={departments}
            dayparts={dayparts}
          />
        );
      case 'chat':
        return <MobileChatTab agentName="planning_assistent" />;
      case 'meldingen':
        return (
          <MobileMeldingenTab
            messageLogs={messageLogs}
            vacationRequests={vacationRequests}
            swapRequests={swapRequests}
            myProfile={myProfile}
            shifts={shifts}
          />
        );
      case 'profiel':
        return (
          <MobileProfielTab
            myProfile={myProfile}
            departments={departments}
            functions={functions}
          />
        );
      case 'verlof':
        return (
          <MobileVerlofTab
            vacationRequests={vacationRequests}
            myProfile={myProfile}
            companyId={companyId}
            onBack={() => navigate('home')}
          />
        );
      case 'ruil':
        return (
          <MobileRuilTab
            swapRequests={swapRequests}
            myProfile={myProfile}
            companyId={companyId}
            shifts={shifts}
            employees={employees}
            onBack={() => navigate('home')}
          />
        );
      default:
        return null;
    }
  };

  // Determine which bottom tab is truly active (for sub-views map to parent)
  const bottomTab = ['verlof', 'ruil'].includes(activeTab) ? 'home' : activeTab;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      <MobileHeader title={headerTitles[activeTab] || 'Dashboard'} />
      
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '5rem' }}>
        {renderContent()}
      </main>

      <MobileBottomNav
        activeTab={bottomTab}
        onTabChange={navigate}
        unreadCount={unreadMessages}
      />
    </div>
  );
}