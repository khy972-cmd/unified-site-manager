import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isTestMode: boolean;
  testRole: "admin" | "worker" | "partner";
  setTestMode: (v: boolean) => void;
  setTestRole: (r: "admin" | "worker" | "partner") => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isTestMode: false,
  testRole: "worker",
  setTestMode: () => {},
  setTestRole: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestMode, setTestMode] = useState(() => {
    return localStorage.getItem("inopnc_test_mode") === "true";
  });
  const [testRole, setTestRole] = useState<"admin" | "worker" | "partner">(() => {
    return (localStorage.getItem("inopnc_test_role") as "admin" | "worker" | "partner") || "worker";
  });

  useEffect(() => {
    let isMounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
      })
      .finally(() => {
        if (!isMounted) return;
        window.clearTimeout(loadingTimeout);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("inopnc_test_mode", isTestMode ? "true" : "false");
  }, [isTestMode]);

  useEffect(() => {
    localStorage.setItem("inopnc_test_role", testRole);
  }, [testRole]);

  const signOut = async () => {
    setTestMode(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      isTestMode,
      testRole,
      setTestMode,
      setTestRole,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
