import React from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Sun, Moon, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function MobileHeader({ title }) {
  const { currentCompany, user } = useCompany();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        {currentCompany?.logo_url ? (
          <img src={currentCompany.logo_url} alt="" className="h-8 w-8 rounded-lg flex-shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)' }}>
            <span className="text-white font-bold text-sm">{currentCompany?.name?.charAt(0) || 'C'}</span>
          </div>
        )}
        <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {title || currentCompany?.name}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 rounded-lg"
          style={{ color: 'var(--color-text-muted)' }}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}