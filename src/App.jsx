import { Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, Component } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/auth/components/auth-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminRoute } from "@/components/guards/admin-route";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground max-w-md text-sm">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Reload page
              </button>
            </div>);
        }
        return this.props.children;
    }
}
const LoginPage = lazy(() => import("@/app/(auth)/login/page"));
const SignupPage = lazy(() => import("@/app/(auth)/signup/page"));
const ForgotPasswordPage = lazy(() => import("@/app/(auth)/forgot-password/page"));
const ResetPasswordPage = lazy(() => import("@/app/(auth)/reset-password/page"));
const LandingPage = lazy(() => import("@/app/page"));
const OnboardingPage = lazy(() => import("@/app/(onboarding)/onboarding/page"));
const DashboardPage = lazy(() => import("@/app/(dashboard)/dashboard/page"));
const ProfilePage = lazy(() => import("@/app/(dashboard)/profile/page"));
const PatientsPage = lazy(() => import("@/app/(dashboard)/patients/page"));
const NewPatientPage = lazy(() => import("@/app/(dashboard)/patients/new/page"));
const PatientDetailPage = lazy(() => import("@/app/(dashboard)/patients/[id]/page"));
const AppointmentsPage = lazy(() => import("@/app/(dashboard)/appointments/page"));
const NewAppointmentPage = lazy(() => import("@/app/(dashboard)/appointments/new/page"));
const TodayAppointmentsPage = lazy(() => import("@/app/(dashboard)/appointments/today/page"));
const CalendarPage = lazy(() => import("@/app/(dashboard)/appointments/calendar/page"));
const AppointmentDetailPage = lazy(() => import("@/app/(dashboard)/appointments/[id]/page"));
const InventoryPage = lazy(() => import("@/app/(dashboard)/inventory/page"));
const NewInventoryItemPage = lazy(() => import("@/app/(dashboard)/inventory/new/page"));
const InventoryItemDetailPage = lazy(() => import("@/app/(dashboard)/inventory/[id]/page"));
const NewConsultationPage = lazy(() => import("@/app/(dashboard)/consultations/new/page"));
const ConsultationDetailPage = lazy(() => import("@/app/(dashboard)/consultations/[id]/page"));
const PatientVisitHistoryPage = lazy(() => import("@/app/(dashboard)/patients/[id]/visits/page"));
const TriageQueuePage = lazy(() => import("@/app/(dashboard)/triage/page"));
const NewTriagePage = lazy(() => import("@/app/(dashboard)/triage/new/page"));
const InvestigationsPage = lazy(() => import("@/app/(dashboard)/investigations/page"));
const ConsultationBillingPage = lazy(() => import("@/app/(dashboard)/consultations/[id]/billing/page"));
const FinancialsPage = lazy(() => import("@/app/(dashboard)/financials/page"));
const NotificationsPage = lazy(() => import("@/app/(dashboard)/notifications/page"));
const SettingsPage = lazy(() => import("@/app/(dashboard)/settings/page"));
const ClinicSettingsPage = lazy(() => import("@/app/(dashboard)/settings/clinic/page"));
const StaffPage = lazy(() => import("@/app/(dashboard)/settings/staff/page"));
const StaffDetailPage = lazy(() => import("@/app/(dashboard)/settings/staff/[id]/page"));
const WhatsAppSettingsPage = lazy(() => import("@/app/(dashboard)/settings/whatsapp/page"));
const WhatsAppPage = lazy(() => import("@/app/(dashboard)/whatsapp/page"));
const SubscriptionPage = lazy(() => import("@/app/(dashboard)/subscription/page"));
const WhatsAppLogsPage = lazy(() => import("@/app/(dashboard)/whatsapp/logs/page"));
const MessageDetailPage = lazy(() => import("@/app/(dashboard)/whatsapp/logs/[id]/page"));
const SuperAdminPage = lazy(() => import("@/app/(dashboard)/super-admin/page"));
const SuperAdminClinics = lazy(() => import("@/app/(dashboard)/super-admin/clinics/page"));
const SuperAdminActivity = lazy(() => import("@/app/(dashboard)/super-admin/activity/page"));
const SuperAdminUsers = lazy(() => import("@/app/(dashboard)/super-admin/users/page"));
const SuperAdminUserDetail = lazy(() => import("@/app/(dashboard)/super-admin/users/[id]/page"));
const SuperAdminSubscriptions = lazy(() => import("@/app/(dashboard)/super-admin/subscriptions/page"));
const SuperAdminWhatsappHealth = lazy(() => import("@/app/(dashboard)/super-admin/whatsapp-health/page"));
const PlatformAnalytics = lazy(() => import("@/app/(dashboard)/super-admin/analytics/page"));
const AdminSupport = lazy(() => import("@/app/(dashboard)/super-admin/support/page"));
const AdminSettings = lazy(() => import("@/app/(dashboard)/super-admin/settings/page"));
const AdminProfile = lazy(() => import("@/app/(dashboard)/super-admin/profile/page"));
const AdminNotifications = lazy(() => import("@/app/(dashboard)/super-admin/notifications/page"));
const SuperAdminPayments = lazy(() => import("@/app/(dashboard)/super-admin/payments/page"));
const PlatformHealthPage = lazy(() => import("@/app/(dashboard)/super-admin/health/page"));
const ClinicDetail = lazy(() => import("@/app/(dashboard)/super-admin/clinics/[id]/page"));
function Spinner() {
    return (<div className="flex min-h-screen items-center justify-center">
      <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent"/>
    </div>);
}
function ProtectedRoute() {
    const { isLoading, isAuthenticated } = useAuth();
    const location = useLocation();
    if (isLoading)
        return <Spinner />;
    if (!isAuthenticated)
        return <Navigate to="/login" state={{ from: location }} replace/>;
    return <Outlet />;
}
function PublicRoute() {
    const { isLoading, isAuthenticated } = useAuth();
    if (isLoading)
        return <Spinner />;
    if (isAuthenticated)
        return <Navigate to="/dashboard" replace/>;
    return <Outlet />;
}
function AuthLayout() {
    return (<div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>);
}
function AppLayout() {
    return (<DashboardLayout>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>);
}
export default function App() {
    return (<ErrorBoundary><ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<LandingPage />}/>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />}/>
                <Route path="/signup" element={<SignupPage />}/>
                <Route path="/forgot-password" element={<ForgotPasswordPage />}/>
                <Route path="/reset-password" element={<ResetPasswordPage />}/>
              </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />}/>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />}/>
                <Route path="/profile" element={<ProfilePage />}/>
                <Route path="/patients" element={<PatientsPage />}/>
                <Route path="/patients/new" element={<NewPatientPage />}/>
                <Route path="/patients/:id" element={<PatientDetailPage />}/>
                <Route path="/patients/:id/visits" element={<PatientVisitHistoryPage />}/>
                <Route path="/consultations/new" element={<NewConsultationPage />}/>
                <Route path="/consultations/:id" element={<ConsultationDetailPage />}/>
                <Route path="/consultations/:id/billing" element={<ConsultationBillingPage />}/>
                <Route path="/triage" element={<TriageQueuePage />}/>
                <Route path="/triage/new" element={<NewTriagePage />}/>
                <Route path="/investigations" element={<InvestigationsPage />}/>
                <Route path="/financials" element={<FinancialsPage />}/>
                <Route path="/appointments" element={<AppointmentsPage />}/>
                <Route path="/appointments/new" element={<NewAppointmentPage />}/>
                <Route path="/appointments/today" element={<TodayAppointmentsPage />}/>
                <Route path="/appointments/calendar" element={<CalendarPage />}/>
                <Route path="/appointments/:id" element={<AppointmentDetailPage />}/>
                <Route path="/inventory" element={<InventoryPage />}/>
                <Route path="/inventory/new" element={<NewInventoryItemPage />}/>
                <Route path="/inventory/:id" element={<InventoryItemDetailPage />}/>
                <Route path="/notifications" element={<NotificationsPage />}/>
                <Route path="/settings" element={<SettingsPage />}/>
                <Route path="/settings/clinic" element={<ClinicSettingsPage />}/>
                <Route path="/settings/staff" element={<StaffPage />}/>
                <Route path="/settings/staff/:id" element={<StaffDetailPage />}/>
                <Route path="/settings/whatsapp" element={<WhatsAppSettingsPage />}/>
                <Route path="/whatsapp" element={<WhatsAppPage />}/>
                <Route path="/subscription" element={<SubscriptionPage />}/>
                <Route path="/whatsapp/logs" element={<WhatsAppLogsPage />}/>
                <Route path="/whatsapp/logs/:id" element={<MessageDetailPage />}/>
                <Route path="/super-admin/*" element={<Navigate to="/admin" replace />}/>
              </Route>
            </Route>

            {/* Admin Portal — separate layout, guarded by isSuperAdmin */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<SuperAdminPage />} />
                <Route path="/admin/clinics" element={<SuperAdminClinics />} />
                <Route path="/admin/clinics/:id" element={<ClinicDetail />} />
                <Route path="/admin/users" element={<SuperAdminUsers />} />
                <Route path="/admin/users/:id" element={<SuperAdminUserDetail />} />
                <Route path="/admin/subscriptions" element={<SuperAdminSubscriptions />} />
                <Route path="/admin/whatsapp-health" element={<SuperAdminWhatsappHealth />} />
                <Route path="/admin/activity" element={<SuperAdminActivity />} />
                <Route path="/admin/analytics" element={<PlatformAnalytics />} />
                <Route path="/admin/support" element={<AdminSupport />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/health" element={<PlatformHealthPage />} />
                <Route path="/admin/payments" element={<SuperAdminPayments />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/profile" element={<AdminProfile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </ThemeProvider></ErrorBoundary>);
}
