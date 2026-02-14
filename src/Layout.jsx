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
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e1b2e 0%, #262344 50%, #2d2a3e 100%)' }}>
        {children}
      </div>
    );
  }

  // Main app layout with horizontal navigation
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <HorizontalNav currentPage={currentPageName} />
      <main className="w-full" style={{ backgroundColor: 'var(--color-background)' }}>
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
          --color-accent: #6366f1;
          --color-accent-hover: #4f46e5;
          --color-accent-light: #818cf8;
          --color-background: #1e1b2e;
          --color-surface: #2d2a3e;
          --color-surface-light: #3d3866;
          --color-text-primary: #ffffff;
          --color-text-secondary: #a8a4b8;
          --color-border: #3d3866;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          background-color: var(--color-background);
          color: var(--color-text-primary);
        }

        .btn-primary, button[class*="bg-primary"], button[class*="bg-blue"] {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          color: white !important;
          border: none !important;
        }

        .btn-primary:hover, button[class*="bg-primary"]:hover, button[class*="bg-blue"]:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
        }

        .bg-primary-dark {
          background-color: var(--color-primary);
        }

        /* Card overrides */
        [class*="bg-white"] {
          background-color: var(--color-surface) !important;
          color: var(--color-text-primary) !important;
        }

        [class*="bg-slate-50"], [class*="bg-gray-50"] {
          background-color: var(--color-surface-light) !important;
        }

        /* Text color overrides */
        [class*="text-slate-900"], [class*="text-gray-900"] {
          color: var(--color-text-primary) !important;
        }

        [class*="text-slate-600"], [class*="text-slate-500"], [class*="text-gray-600"], [class*="text-gray-500"] {
          color: var(--color-text-secondary) !important;
        }

        /* Border overrides */
        [class*="border-slate"], [class*="border-gray"] {
          border-color: var(--color-border) !important;
        }

        /* Input overrides */
        input, textarea, select {
          background-color: var(--color-surface-light) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }

        input::placeholder, textarea::placeholder {
          color: var(--color-text-secondary) !important;
        }
      `}</style>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </CompanyProvider>
  );
}