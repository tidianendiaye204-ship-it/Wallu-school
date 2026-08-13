import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getSchoolForUser } from "../../lib/api";

interface AuthContextType {
  session: any;
  user: any;
  schoolId: string | null;
  schoolName: string;
  schoolLogo: string | null;
  setSchoolLogo: (url: string | null) => void;
  schoolStamp: string | null;
  setSchoolStamp: (url: string | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  schoolId: null,
  schoolName: "",
  schoolLogo: null,
  setSchoolLogo: () => {},
  schoolStamp: null,
  setSchoolStamp: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolStamp, setSchoolStamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        getSchoolForUser(session.user.id).then((school) => {
          if (school) {
            setSchoolId(school.id);
            setSchoolName(school.name);
            setSchoolLogo(school.logo_url || null);
            setSchoolStamp(school.stamp_url || null);
          }
          setLoading(false);
        }).catch(err => {
          console.error("Erreur récupération école:", err);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        getSchoolForUser(session.user.id).then((school) => {
          if (school) {
            setSchoolId(school.id);
            setSchoolName(school.name);
            setSchoolLogo(school.logo_url || null);
            setSchoolStamp(school.stamp_url || null);
          }
        });
      } else {
        setSchoolId(null);
        setSchoolName("");
        setSchoolLogo(null);
        setSchoolStamp(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user, schoolId, schoolName, schoolLogo, setSchoolLogo, schoolStamp, setSchoolStamp, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
