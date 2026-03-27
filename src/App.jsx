import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import Landing from './pages/Landing';
import Abonnementen from './pages/Abonnementen';
import PlanningTool from './pages/PlanningTool';
import PlanningTemplates from './pages/PlanningTemplates';
import RoosterDashboard from './pages/RoosterDashboard';
import MijnBerichten from './pages/MijnBerichten';
import MedewerkerApp from './pages/MedewerkerApp';
import LegalPage from './pages/LegalPage';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const ProtectedRoute = ({ children, currentPageName }) => (
  <RequireAuth>
    <LayoutWrapper currentPageName={currentPageName}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </LayoutWrapper>
  </RequireAuth>
);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            {/* Public routes - no login required */}
            <Route path="/" element={<Landing />} />
            <Route path="/Landing" element={<Landing />} />
            <Route path="/Abonnementen" element={
              <LayoutWrapper currentPageName="Abonnementen"><Abonnementen /></LayoutWrapper>
            } />

            {/* Protected routes from pages.config (legacy) */}
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <ProtectedRoute currentPageName={path}>
                    <Page />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* Protected routes added manually */}
            <Route path="/PlanningTool" element={
              <ProtectedRoute currentPageName="PlanningTool"><PlanningTool /></ProtectedRoute>
            } />
            <Route path="/PlanningTemplates" element={
              <ProtectedRoute currentPageName="PlanningTemplates"><PlanningTemplates /></ProtectedRoute>
            } />
            <Route path="/RoosterDashboard" element={
              <ProtectedRoute currentPageName="RoosterDashboard"><RoosterDashboard /></ProtectedRoute>
            } />
            <Route path="/MijnBerichten" element={
              <ProtectedRoute currentPageName="MijnBerichten"><MijnBerichten /></ProtectedRoute>
            } />
            <Route path="/MedewerkerApp" element={
              <ProtectedRoute currentPageName="MedewerkerApp"><MedewerkerApp /></ProtectedRoute>
            } />

            <Route path="/legal" element={<LegalPage />} />

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App