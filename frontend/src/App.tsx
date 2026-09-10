import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { OrgAdminDashboard } from "./pages/OrgAdminDashboard";
import { DriverDashboard } from "./pages/DriverDashboard";
import { StudentDashboard, ParentDashboard } from "./pages/StudentParentDashboard";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { UserRole } from "@mtrx/shared";

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [isGuestStudent, setIsGuestStudent] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0D0D0D]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center font-bold text-black text-2xl mx-auto animate-pulse">
            MT
          </div>
          <h2 className="text-sm tracking-[0.25em] font-semibold text-gold-400 uppercase">RIT</h2>
          <p className="text-xs text-silver-400 animate-bounce">Loading Zero-Cost Cloud Transit Fleet...</p>
        </div>
      </div>
    );
  }

  if (!user && isGuestStudent) {
    return (
      <div className="min-h-screen w-full max-w-full flex flex-col bg-[#0D0D0D] text-gray-100 selection:bg-gold-500 selection:text-black overflow-x-hidden relative">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 overflow-x-hidden">
          <StudentDashboard isGuest={true} onExitGuest={() => setIsGuestStudent(false)} />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onOpenStudentView={() => setIsGuestStudent(true)} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return <SuperAdminDashboard />;
      case UserRole.ORG_ADMIN:
        return <OrgAdminDashboard />;
      case UserRole.DRIVER:
        return <DriverDashboard />;
      case UserRole.PARENT:
        return <ParentDashboard />;
      case UserRole.STUDENT:
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-[#0D0D0D] text-gray-100 selection:bg-gold-500 selection:text-black overflow-x-hidden relative">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 overflow-x-hidden">
        {renderDashboard()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
