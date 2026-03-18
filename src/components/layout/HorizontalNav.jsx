import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '../providers/CompanyProvider';
import { useTheme } from '../providers/ThemeProvider';
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
  Menu,
  Sun,
  Moon,
  Crown,
  FileText,
  MessageCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import WhatsAppPanel from '@/components/whatsapp/WhatsAppPanel';
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
  { id: 'rooster-dashboard', label: 'Rooster Dashboard', icon: CalendarCheck, page: 'RoosterDashboard', permission: 'manage_schedules' },
  { id: 'schedules', label: 'Alle Roosters', icon: Calendar, page: 'Schedules', permission: 'manage_schedules' },
  { id: 'employees', label: 'Medewerkers', icon: Users, page: 'Employees', permission: 'manage_schedules' },
  { id: 'planning-tool', label: 'Planningshulpmiddel', icon: Calendar, page: 'PlanningTool', permission: 'manage_schedules' },
  { id: 'planning-templates', label: 'Planning Templates', icon: FileText, page: 'PlanningTemplates', permission: 'manage_schedules' },
  { id: 'ai-assistant', label: 'AI Assistent', icon: Sparkles, page: 'AIAssistant', permission: 'use_ai' },
  { id: 'departments', label: 'Afdelingen', icon: Building2, page: 'Departments', permission: 'manage_schedules' },
  { id: 'locations', label: 'Locaties', icon: MapPin, page: 'Locations', permission: 'manage_schedules' },
  { id: 'functions-skills', label: 'Functies & Vaardigheden', icon: Briefcase, page: 'FunctionsSkills', permission: 'manage_schedules' },
  { id: 'vacation-requests', label: 'Verlofaanvragen', icon: Calendar, page: 'VacationRequests', permission: null },
  { id: 'swap-requests', label: 'Ruilverzoeken', icon: Calendar, page: 'SwapRequests', permission: null },
  { id: 'mijn-berichten', label: 'Mijn Berichten', icon: MessageCircle, page: 'MijnBerichten', permission: null },
  { id: 'settings', label: 'Instellingen', icon: Settings, page: 'CompanySettings', permission: 'manage_company' },
  { id: 'ai-test-suite', label: 'AI Test Suite', icon: Sparkles, page: 'AITestSuite', permission: 'manage_company' },
];

export default function HorizontalNav({ currentPage }) {
  const { currentCompany, userRole, user, hasPermission, switchCompany } = useCompany();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const navigate = useNavigate();

  const companyId = currentCompany?.id;

  const { data: unreadLogs = [] } = useQuery({
    queryKey: ['whatsapp-unread', companyId],
    queryFn: () => base44.entities.WhatsAppMessageLog.filter({ companyId, direction: 'inbound', read: false }),
    enabled: !!companyId && hasPermission('manage_schedules'),
    refetchInterval: 30000,
  });
  const unreadCount = unreadLogs.length;

  const handleSwitchCompany = () => {
    switchCompany();
    navigate(createPageUrl('CompanySelect'));
  };

  // Get user's preferred menu items from their profile, or use defaults
  const userPreferences = user?.preferences || {};
  const isEmployee = !hasPermission('manage_schedules');
  const defaultMenuIds = isEmployee
    ? ['dashboard', 'schedule-overview', 'vacation-requests', 'swap-requests', 'mijn-berichten']
    : ['dashboard', 'rooster-dashboard', 'employees', 'ai-assistant'];
  const preferredMenuIds = userPreferences.horizontal_menu_items || defaultMenuIds;

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
    <>
    <nav className="sticky top-0 z-50" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Company name & primary navigation */}
          <div className="flex items-center gap-6">
            {/* Company Info */}
            <button 
              onClick={handleSwitchCompany}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{ hover: { backgroundColor: 'var(--color-surface-light)' } }}
            >
              {currentCompany?.logo_url ? (
                <img src={currentCompany.logo_url} alt={currentCompany.name} className="h-8 w-8 rounded" />
              ) : (
                <div className="h-8 w-8 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)' }}>
                  <span className="text-white font-bold text-sm">
                    {currentCompany?.name?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{currentCompany?.name}</div>
                <div className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{userRole?.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block" style={{ color: 'var(--color-text-secondary)' }} />
            </button>

            {/* Primary Navigation - Desktop */}
            <div className="hidden lg:flex items-center gap-1">
              <Link
                to="/Landing"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                title="Terug naar homepage"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Home</span>
              </Link>
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <Link
                    key={item.id}
                    to={createPageUrl(item.page)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={isActive ? { 
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      color: 'var(--color-accent-light)'
                    } : { 
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Theme toggle + More menu + User menu */}
          <div className="flex items-center gap-3">
            {/* WhatsApp icon - planners/admins only */}
            {hasPermission('manage_schedules') && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWhatsAppOpen(!whatsAppOpen)}
                  className="rounded-lg"
                  style={{ color: whatsAppOpen ? '#22c55e' : 'var(--color-text-secondary)' }}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="rounded-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

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
                <button className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-opacity-80">
                  <div className="text-right mr-1">
                    <p className="font-medium text-xs" style={{ color: 'var(--color-text-primary)' }}>{user?.full_name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{userRole?.replace('_', ' ')}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-white text-xs" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)' }}>
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{user?.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
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
    {whatsAppOpen && hasPermission('manage_schedules') && (
      <WhatsAppPanel onClose={() => setWhatsAppOpen(false)} />
    )}
    </>
  );
}