import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type UserProfile = {
  display_name: string | null;
  email: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("profiles fetch:", error.message);
    return null;
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    const row = await fetchProfile(uid);
    setProfile(row);
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void (async () => {
      const uid = session?.user?.id;
      if (!uid) {
        setProfile(null);
        return;
      }
      const row = await fetchProfile(uid);
      setProfile(row);
    })();
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    const local = trimmed.split("@")[0] || "User";
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        data: { display_name: local },
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    if (data.user) {
      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email,
          display_name: local,
        },
        { onConflict: "id" },
      );
      if (upsertError) {
        console.warn("profiles upsert:", upsertError.message);
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
