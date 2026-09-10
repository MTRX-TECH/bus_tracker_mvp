import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { UserRole } from "@mtrx/shared";

interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  orgId?: string;
  orgName?: string;
  assignedBusId?: string | any;
  hasConsentedToLocationTracking?: boolean;
  consentTimestamp?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      if (res.data.success) {
        const u = res.data.data.user;
        const o = res.data.data.organization;
        setUser({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          orgId: u.orgId,
          orgName: o?.name || "RIT Super Admin",
          assignedBusId: u.assignedBusId,
          hasConsentedToLocationTracking: u.hasConsentedToLocationTracking,
          consentTimestamp: u.consentTimestamp,
          mustChangePassword: u.mustChangePassword,
        });
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post("/auth/login", { email, password: pass });
    if (res.data.success) {
      await fetchProfile();
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
