import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminLayout } from './features/admin/components/AdminLayout';
import './App.css';

// Lazy-loaded App Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveCalls = lazy(() => import('./pages/LiveCalls'));
const Investigation = lazy(() => import('./pages/Investigation'));
const AttackPrevention = lazy(() => import('./pages/AttackPrevention'));

// Lazy-loaded Admin Pages
const AdminOverview = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.AdminOverview })));
const OrganizationsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.OrganizationsAdmin })));
const UsersAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.UsersAdmin })));
const RolesAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.RolesAdmin })));
const PoliciesAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.PoliciesAdmin })));
const VoiceProfilesAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.VoiceProfilesAdmin })));
const DevicesAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.DevicesAdmin })));
const IntegrationsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.IntegrationsAdmin })));
const NotificationsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.NotificationsAdmin })));
const AiServicesAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.AiServicesAdmin })));
const ModelEvaluationAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.ModelEvaluationAdmin })));
const SystemPerformanceAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.SystemPerformanceAdmin })));
const IntegrationOrchestratorAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.IntegrationOrchestratorAdmin })));
const DataRetentionAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.DataRetentionAdmin })));
const AuditLogsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.AuditLogsAdmin })));
const ReportsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.ReportsAdmin })));
const SystemHealthAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.SystemHealthAdmin })));
const PlatformSettingsAdmin = lazy(() => import('./features/admin/pages').then((m) => ({ default: m.PlatformSettingsAdmin })));

function PageLoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-text-muted">Loading module...</span>
      </div>
    </div>
  );
}

// Placeholder pages for unimplemented routes
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🚧</p>
          <h2 className="text-lg font-semibold text-text-primary mb-1">{title}</h2>
          <p className="text-sm text-text-muted">This module will be implemented in a future phase.</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          {/* Phase 24 — Enterprise Admin Portal Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="organizations" element={<OrganizationsAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="roles" element={<RolesAdmin />} />
            <Route path="policies" element={<PoliciesAdmin />} />
            <Route path="voice-profiles" element={<VoiceProfilesAdmin />} />
            <Route path="devices" element={<DevicesAdmin />} />
            <Route path="integrations" element={<IntegrationsAdmin />} />
            <Route path="integration" element={<IntegrationOrchestratorAdmin />} />
            <Route path="notifications" element={<NotificationsAdmin />} />
            <Route path="ai-services" element={<AiServicesAdmin />} />
            <Route path="evaluations" element={<ModelEvaluationAdmin />} />
            <Route path="performance" element={<SystemPerformanceAdmin />} />
            <Route path="retention" element={<DataRetentionAdmin />} />
            <Route path="audit-logs" element={<AuditLogsAdmin />} />
            <Route path="reports" element={<ReportsAdmin />} />
            <Route path="health" element={<SystemHealthAdmin />} />
            <Route path="settings" element={<PlatformSettingsAdmin />} />
          </Route>

          {/* SOC Operations Application Routes */}
          <Route
            path="*"
            element={
              <div className="flex h-screen overflow-hidden bg-bg-primary">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <Suspense fallback={<PageLoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/live" element={<LiveCalls />} />
                      <Route path="/investigation" element={<Investigation />} />
                      <Route path="/prevention" element={<AttackPrevention />} />
                      <Route path="/speakers" element={<PlaceholderPage title="Speaker Profiles" />} />
                      <Route path="/audio" element={<PlaceholderPage title="Audio Engine" />} />
                      <Route path="/database" element={<PlaceholderPage title="Database Browser" />} />
                      <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
                      <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
                    </Routes>
                  </Suspense>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
