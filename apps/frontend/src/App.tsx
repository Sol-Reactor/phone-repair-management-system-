import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { InternalLayout } from "./components/InternalLayout";
import { RequireAdmin } from "./components/RequireAdmin";
import { RequireAuth } from "./components/RequireAuth";
import { PublicLayout } from "./components/public/PublicLayout";
import { HomePage } from "./pages/public/HomePage";
import { AboutPage } from "./pages/public/AboutPage";
import { TrackPage } from "./pages/public/TrackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TechnicianDashboardPage } from "./pages/TechnicianDashboardPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SlipPage } from "./pages/SlipPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminRepairTypesPage } from "./pages/admin/AdminRepairTypesPage";
import { AdminPriceListPage } from "./pages/admin/AdminPriceListPage";
import { AdminMessagesPage } from "./pages/admin/AdminMessagesPage";
import { AdminWholesalePage } from "./pages/admin/AdminWholesalePage";
import { AdminAnalyticsPage } from "./pages/admin/AdminAnalyticsPage";
import { WholesaleReceiptPage } from "./pages/admin/WholesaleReceiptPage";
import { AdminInventoryAdvancedPage } from "./pages/admin/AdminInventoryAdvancedPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public marketing site */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="track/:code" element={<TrackPage />} />
          </Route>

          {/* Internal staff tool. Two real roles now (ADMIN + TECHNICIAN,
              see lib/auth.tsx): routes both roles use day-to-day are gated
              with RequireAuth; owner-only financial/config screens use
              RequireAdmin, which also checks role === "ADMIN". */}
          <Route element={<InternalLayout />}>
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/register"
              element={
                <RequireAuth>
                  <RegisterPage />
                </RequireAuth>
              }
            />
            <Route
              path="/technician"
              element={
                <RequireAuth>
                  <TechnicianDashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/tickets/:id/slip"
              element={
                <RequireAuth>
                  <SlipPage />
                </RequireAuth>
              }
            />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/settings"
              element={
                <RequireAdmin>
                  <AdminSettingsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/repair-types"
              element={
                <RequireAdmin>
                  <AdminRepairTypesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/price-list"
              element={
                <RequireAdmin>
                  <AdminPriceListPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <RequireAdmin>
                  <AdminMessagesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/wholesale"
              element={
                <RequireAdmin>
                  <AdminWholesalePage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/wholesale/receipt/:id"
              element={
                <RequireAdmin>
                  <WholesaleReceiptPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <RequireAdmin>
                  <AdminAnalyticsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/inventory-advanced"
              element={
                <RequireAdmin>
                  <AdminInventoryAdvancedPage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
