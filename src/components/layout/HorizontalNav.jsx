import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '../providers/CompanyProvider';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  Sparkles,
  Building2,
  MapPin,
  Briefcase,
  Settings,
  LogOut,
  ChevronDown,
  Menu
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', permission: null },
  { id: 'schedule-overview', label: 'Roosters Overzicht', icon: CalendarCheck, page: 'ScheduleOverview', permission: null },
  { id: 'schedules', label: 'Alle Roosters', icon: Calendar, page: 'Schedules', permission: 'manage_schedules' },
  { id: 'employees', label: 'Medewerkers', icon: Users, page: 'Employees', permission: 'manage_schedules' },
  { id: 'ai-assistant', label: 'AI Assistent', icon: Sparkles, page: 'AIAssistant', permission: 'use_ai' },
  { id: 'departments', label: 'Afdelingen', icon: Building2, page: 'Departments', permission: 'manage_schedules' },
  { id: 'locations', label: 'Locaties', icon: MapPin, page: 'Locations', permission: 'manage_schedules' },
  { id: 'functions-skills', label: 'Functies & Vaardigheden', icon: Briefcase, page: 'FunctionsSkills', permission: 'manage_schedules' },
  { id: 'vacation-requests', label: 'Verlofaanvragen', icon: Calendar, page: 'VacationRequests', permission: null },
  { id: 'swap-requests', label: 'Ruilverzoeken', icon: Calendar, page: 'SwapRequests', permission: null },
  { id: 'settings', label: 'Instellingen', icon: Settings, page: 'CompanySettings', permission: 'manage_company' },
];

export default function HorizontalNav({ currentPage }) {
  const { currentCompany, userRole, user, hasPermission, switchCompany } = useCompany();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user's preferred menu items from their profile, or use defaults
  const userPreferences = user?.preferences || {};
  const preferredMenuIds = userPreferences.horizontal_menu_items || [
    'dashboard',
    'schedule-overview', 
    'schedules',
    'employees',
    'ai-assistant'
  ];

  // Filter items based on permissions
  const accessibleItems = allNavItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  // Split into primary (shown in menu) and secondary (in dropdown)
  const primaryItems = accessibleItems.filter(item => 
    preferredMenuIds.includes(item.id)
  ).slice(0, 5);

  const secondaryItems = accessibleItems.filter(item => 
    !preferredMenuIds.includes(item.id)
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Company name & primary navigation */}
          <div className="flex items-center gap-6">
            {/* Company Info */}
            <button 
              onClick={switchCompany}
              className="flex items-center gap-3 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              {currentCompany?.logo_url ? (
                <img src={currentCompany.logo_url} alt={currentCompany.name} className="h-8 w-8 rounded" />
              ) : (
                <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {currentCompany?.name?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-slate-900 text-sm">{currentCompany?.name}</div>
                <div className="text-xs text-slate-500 capitalize">{userRole?.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Primary Navigation - Desktop */}
            <div className="hidden lg:flex items-center gap-1">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <Link
                    key={item.id}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: More menu + User menu */}
          <div className="flex items-center gap-3">
            {/* More Menu (Secondary items) - Desktop */}
            {secondaryItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden lg:flex">
                    <Menu className="w-4 h-4 mr-2" />
                    Meer
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {secondaryItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link to={createPageUrl(item.page)} className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;
                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link 
                        to={createPageUrl(item.page)} 
                        className={`flex items-center gap-3 ${isActive ? 'bg-blue-50 text-blue-700' : ''}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-3" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu - Desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden lg:flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-medium text-slate-900 text-sm">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-3" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}