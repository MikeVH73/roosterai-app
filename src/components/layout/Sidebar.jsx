import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '../providers/CompanyProvider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CalendarDays,
  Sparkles,
  Clock,
  ArrowLeftRight,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  MapPin,
  Briefcase
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';

const navItems = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    page: 'Dashboard',
    permission: null 
  },
  { 
    label: 'Roosters Overzicht', 
    icon: CalendarDays, 
    page: 'ScheduleOverview',
    permission: null 
  },
  { 
    label: 'Alle Roosters', 
    icon: Calendar, 
    page: 'Schedules',
    permission: 'manage_schedules' 
  },
  { 
    label: 'Medewerkers', 
    icon: Users, 
    page: 'Employees',
    permission: 'manage_schedules' 
  },
  { 
    label: 'Afdelingen', 
    icon: Building2, 
    page: 'Departments',
    permission: 'manage_schedules' 
  },
  { 
    label: 'Locaties', 
    icon: MapPin, 
    page: 'Locations',
    permission: 'manage_schedules' 
  },
  { 
    label: 'Locatie Types', 
    icon: MapPin, 
    page: 'LocationTypes',
    permission: 'manage_schedules' 
  },
  { 
    label: 'Functies & Skills', 
    icon: Briefcase, 
    page: 'FunctionsSkills',
    permission: 'manage_schedules' 
  },
  { type: 'divider' },
  { 
    label: 'AI Assistent', 
    icon: Sparkles, 
    page: 'AIAssistant',
    permission: 'use_ai',
    badge: 'AI'
  },
  { type: 'divider' },
  { 
    label: 'Verlofaanvragen', 
    icon: Clock, 
    page: 'VacationRequests',
    permission: null 
  },
  { 
    label: 'Ruilverzoeken', 
    icon: ArrowLeftRight, 
    page: 'SwapRequests',
    permission: null 
  },
  { type: 'divider' },
  { 
    label: 'Instellingen', 
    icon: Settings, 
    page: 'CompanySettings',
    permission: 'manage_company' 
  },
  { 
    label: 'Abonnement', 
    icon: CreditCard, 
    page: 'Billing',
    permission: 'manage_billing' 
  },
];

export default function Sidebar({ currentPage }) {
  const { currentCompany, userRole, user, switchCompany, hasPermission, userMemberships } = useCompany();

  const handleLogout = () => {
    base44.auth.logout();
  };

  const roleLabels = {
    company_admin: 'Administrator',
    planner: 'Planner',
    employee: 'Medewerker'
  };

  const planLabels = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise'
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Company Header */}
      <div className="p-4 border-b border-slate-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-3 px-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                  {currentCompany?.name?.charAt(0) || 'C'}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-slate-900 truncate text-sm">
                    {currentCompany?.name || 'Selecteer bedrijf'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {roleLabels[userRole] || 'Geen rol'}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {userMemberships.length > 1 && (
              <>
                <DropdownMenuItem onClick={switchCompany}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Wissel van bedrijf
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            if (item.type === 'divider') {
              return <li key={index} className="my-3 border-t border-slate-100" />;
            }

            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            const isActive = currentPage === item.page;
            const Icon = item.icon;

            return (
              <li key={item.page}>
                <Link
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-blue-600" : "text-slate-400"
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">AI Acties</span>
            <Badge variant="outline" className="text-[10px]">
              {planLabels[currentCompany?.subscription_plan] || 'Starter'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(((currentCompany?.ai_actions_used || 0) / (currentCompany?.ai_actions_limit || 300)) * 100, 100)}%` 
                }}
              />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {currentCompany?.ai_actions_used || 0}/{currentCompany?.ai_actions_limit || 300}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}