import React from 'react';
import { CompanyProvider, useCompany } from './components/providers/CompanyProvider';
import HorizontalNav from './components/layout/HorizontalNav';
import { Loader2 } from 'lucide-react';

// Pages that don't need company context
const publicPages = ['CompanySelect', 'CompanyOnboarding'];

function LayoutContent({ children, currentPageName }) {
  const { currentCompany, loading } = useCompany();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Public pages or company selection needed
  if (publicPages.includes(currentPageName) || !currentCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        {children}
      </div>
    );
  }

  // Main app layout with horizontal navigation
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <HorizontalNav currentPage={currentPageName} />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <CompanyProvider>
      <style>{`
        :root {
          --color-primary: #262344;
          --color-primary-light: #3d3866;
          --color-accent: #7c3aed;
          --color-accent-hover: #6d28d9;
          --color-background: #f8fafc;
          --color-surface: #ffffff;
          --color-text-primary: #1e293b;
          --color-text-secondary: #64748b;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }
        
        .btn-primary {
          background-color: var(--color-accent) !important;
        }
        
        .btn-primary:hover {
          background-color: var(--color-accent-hover) !important;
        }
        
        .bg-primary-dark {
          background-color: var(--color-primary);
        }
      `}</style>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </CompanyProvider>
  );
}