import React from 'react';
import { CompanyProvider, useCompany } from './components/providers/CompanyProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import HorizontalNav from './components/layout/HorizontalNav';
import { Loader2 } from 'lucide-react';

// Pages that don't need company context
const publicPages = ['CompanySelect', 'CompanyOnboarding', 'Landing'];

// Pages with their own navigation (no HorizontalNav)
const selfNavigatingPages = ['MedewerkerApp'];

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

  // Public pages or company selection - always dark gradient background
  if (publicPages.includes(currentPageName) || !currentCompany) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e1b2e 0%, #262344 50%, #2d2a3e 100%)' }}>
        {children}
      </div>
    );
  }

  // Self-navigating pages (like mobile app) - no HorizontalNav
  if (selfNavigatingPages.includes(currentPageName)) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
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
    <ThemeProvider>
      <CompanyProvider>
        <style>{`

        :root, [data-theme="light"] {
          --color-primary: #1e293b;
          --color-primary-light: #334155;
          --color-accent: #0ea5e9;
          --color-accent-hover: #0284c7;
          --color-accent-light: #38bdf8;
          --color-background: #f8fafc;
          --color-surface: #ffffff;
          --color-surface-light: #f1f5f9;
          --color-text-primary: #0f172a;
          --color-text-secondary: #475569;
          --color-text-muted: #64748b;
          --color-border: #e2e8f0;
        }

        [data-theme="dark"] {
          --color-primary: #1e3a8a;
          --color-primary-light: #1e40af;
          --color-accent: #38bdf8;
          --color-accent-hover: #0ea5e9;
          --color-accent-light: #7dd3fc;
          --color-background: #0f172a;
          --color-surface: #1e293b;
          --color-surface-light: #334155;
          --color-text-primary: #ffffff;
          --color-text-secondary: #e2e8f0;
          --color-text-muted: #cbd5e1;
          --color-border: #475569;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          background-color: var(--color-background);
          color: var(--color-text-primary);
        }

        /* ===== THEME-AWARE OVERRIDES ===== */

        /* Backgrounds */
        [class*="bg-white"]:not(.avatar-fallback):not([class*="bg-white/"]) {
          background-color: var(--color-surface) !important;
        }
        [class*="bg-slate-50"], [class*="bg-gray-50"], [class*="bg-blue-50"],
        [class*="bg-slate-100"], [class*="bg-gray-100"] {
          background-color: var(--color-surface-light) !important;
        }

        /* Text — primary (darkest readable) */
        .text-slate-900, .text-gray-900, .text-slate-800, .text-gray-800,
        .text-black {
          color: var(--color-text-primary) !important;
        }
        /* Text — secondary */
        .text-slate-700, .text-gray-700, .text-slate-600, .text-gray-600 {
          color: var(--color-text-secondary) !important;
        }
        /* Text — muted */
        .text-slate-500, .text-gray-500, .text-slate-400, .text-gray-400,
        .text-slate-300 {
          color: var(--color-text-muted) !important;
        }

        /* Headings always primary */
        h1, h2, h3, h4, h5, h6 {
          color: var(--color-text-primary) !important;
        }

        /* Paragraphs, spans, divs inherit */
        p, span, div, label, li, td, th {
          color: inherit;
        }

        /* Borders */
        [class*="border-slate"], [class*="border-gray"],
        [class*="divide-slate"], [class*="divide-gray"] {
          border-color: var(--color-border) !important;
        }

        /* Inputs & form elements */
        input, textarea, select {
          background-color: var(--color-surface-light) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }
        input::placeholder, textarea::placeholder {
          color: var(--color-text-muted) !important;
        }

        /* Dropdowns & popovers */
        [role="menu"], [role="menuitem"], [role="listbox"], [role="option"],
        [data-radix-popper-content-wrapper] [role="listbox"],
        [data-radix-popper-content-wrapper] div {
          background-color: var(--color-surface);
          color: var(--color-text-primary);
        }

        /* Dialogs */
        [role="dialog"] {
          background-color: var(--color-surface) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }

        /* Tables */
        table, thead, tbody, tr, th, td {
          border-color: var(--color-border) !important;
        }
        th {
          color: var(--color-text-secondary) !important;
          background-color: var(--color-surface-light) !important;
        }
        td {
          color: var(--color-text-primary) !important;
        }

        /* Cards — ensure text inside cards is readable */
        .rounded-xl, .rounded-lg, .rounded-md {
          color: var(--color-text-primary);
        }

        /* Buttons */
        .btn-primary, button[class*="bg-primary"], button[class*="bg-blue"] {
          background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%) !important;
          color: white !important;
          border: none !important;
        }
        .btn-primary:hover, button[class*="bg-primary"]:hover, button[class*="bg-blue"]:hover {
          background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
        }
        button {
          color: inherit;
        }
        button[class*="outline"], button[variant="outline"] {
          color: var(--color-text-primary) !important;
          background-color: var(--color-surface) !important;
          border-color: var(--color-border) !important;
        }
        button[class*="ghost"] {
          color: var(--color-text-primary) !important;
        }

        /* Badges */
        [class*="badge"] {
          border-color: var(--color-border) !important;
        }

        /* Tabs */
        [role="tablist"] {
          background-color: var(--color-surface-light) !important;
          border-color: var(--color-border) !important;
        }
        [role="tab"] {
          color: var(--color-text-muted) !important;
        }
        [role="tab"][data-state="active"], [role="tab"][aria-selected="true"] {
          color: var(--color-text-primary) !important;
          background-color: var(--color-surface) !important;
        }

        /* Tooltips */
        [role="tooltip"] {
          background-color: var(--color-surface) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }

        /* Icons inherit from parent */
        svg {
          color: inherit;
        }

        /* Scrollbar for dark mode */
        [data-theme="dark"] ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        [data-theme="dark"] ::-webkit-scrollbar-track {
          background: var(--color-background);
        }
        [data-theme="dark"] ::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }
        `}</style>
        <LayoutContent currentPageName={currentPageName}>
        {children}
        </LayoutContent>
        </CompanyProvider>
        </ThemeProvider>
        );
        }