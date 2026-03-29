import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Nearby from "./pages/Nearby";
import Announcements from "./pages/Announcements";
import Live from "./pages/Live";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import ChurchDetails from "./pages/ChurchDetails";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MaintenanceGuard } from "./components/MaintenanceGuard";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MaintenanceGuard>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/nearby" element={<Nearby />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/live" element={<Live />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/church/:id" element={<ChurchDetails />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin-login" element={<AdminAuth />} />
              </Routes>
            </Layout>
            <Toaster position="top-center" />
          </Router>
        </MaintenanceGuard>
      </AuthProvider>
    </ErrorBoundary>
  );
}
