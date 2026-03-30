import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type UserProfile = {
  display_name: string | null;
  email: string | null;
};

export type AuthDebugInfo = {
  emailUsed: string;
  hasSession: boolean;
  code?: string;
  status?: number;
  emailConfirmedAt?: string | null;
};

export type AuthOperationResult = {
  error: Error | null;
  debug: AuthDebugInfo;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthOperationResult>;
  signUp: (email: string, password: string) => Promise<AuthOperationResult>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromUser(user: User): UserProfile {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.display_name === "string" && meta.display_name.trim() !== ""
      ? meta.display_name
      : null;
  return {
    display_name: fromMeta ?? user.email?.split("@")[0] ?? null,
    email: user.email ?? null,
  };
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const missingTable =
      error.message.includes("schema cache") ||
      error.message.includes("Could not find the table");
    if (!missingTable) {
      console.warn("profiles fetch:", error.message);
    }
    return null;
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const user = session?.user;
    if (!user) {
      setProfile(null);
      return;
    }
    const row = await fetchProfile(user.id);
    setProfile(row ?? profileFromUser(user));
  }, [session?.user]);

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
    const user = session?.user;
    if (!user) {
      setProfile(null);
      return;
    }
    void (async () => {
      const row = await fetchProfile(user.id);
      setProfile(row ?? profileFromUser(user));
    })();
  }, [session?.user?.id, session?.user?.email, session?.user?.user_metadata]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    const debug: AuthDebugInfo = {
      emailUsed: trimmed,
      hasSession: !!data?.session,
      code: error?.code,
      status: typeof error?.status === "number" ? error.status : undefined,
      emailConfirmedAt: data?.user?.email_confirmed_at ?? null,
    };

    if (__DEV__) {
      console.log("[auth] signIn", {
        email: trimmed,
        passwordLength: password.length,
        ...debug,
        message: error?.message,
      });
    }

    return {
      error: error ? new Error(error.message) : null,
      debug,
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmed = normalizeEmail(email);
    const local = trimmed.split("@")[0] || "User";
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        data: { display_name: local },
      },
    });

    const debug: AuthDebugInfo = {
      emailUsed: trimmed,
      hasSession: !!data?.session,
      code: error?.code,
      status: typeof error?.status === "number" ? error.status : undefined,
      emailConfirmedAt: data?.user?.email_confirmed_at ?? null,
    };

    if (__DEV__) {
      console.log("[auth] signUp", {
        email: trimmed,
        passwordLength: password.length,
        ...debug,
        message: error?.message,
      });
    }

    if (error) {
      return { error: new Error(error.message), debug };
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

    return { error: null, debug };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const trimmed = normalizeEmail(email);
    if (!trimmed) {
      return { error: new Error("Enter your email address first.") };
    }
    const redirectTo = Linking.createURL("/");
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    if (__DEV__) {
      console.log("[auth] resetPasswordForEmail", {
        email: trimmed,
        redirectTo,
        error: error?.message,
      });
    }
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.warn("signOut:", error.message);
      }
    } catch (e) {
      console.warn("signOut:", e);
    }
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      resetPassword,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, resetPassword, signOut, refreshProfile],
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
