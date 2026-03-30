import { MaterialIcons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AuthDebugInfo } from "@/contexts/auth-context";
import { useAuth } from "@/contexts/auth-context";

function appendAuthLog(
  setter: Dispatch<SetStateAction<string>>,
  label: string,
  payload: Record<string, unknown>,
) {
  const line = `${new Date().toLocaleTimeString()} ${label} ${JSON.stringify(payload)}`;
  console.log("[auth]", line);
  setter((prev) => `${line}\n${prev}`.slice(0, 6000));
}

function isInvalidCredentials(debug: AuthDebugInfo, errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    debug.code === "invalid_credentials"
  );
}

function invalidCredentialsHint(): string {
  return [
    "That message only means Supabase rejected this email/password pair — not necessarily email confirmation.",
    "",
    "Check: exact password; email spelling; your app .env matches this Supabase project.",
    "",
    "If this user was created while “Confirm email” was ON, they can still be unconfirmed in the database after you turn it off. In Dashboard → Authentication → Users, open the user and see if they are confirmed; if not, confirm them or set a new password (Forgot password below).",
  ].join("\n");
}

export default function Index() {
  const { session, loading, signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authLog, setAuthLog] = useState("");

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const onSignIn = async () => {
    setMessage(null);
    setBusy(true);
    const { error, debug } = await signIn(email, password);
    setBusy(false);
    if (__DEV__) {
      appendAuthLog(setAuthLog, "signIn", {
        ...debug,
        error: error?.message ?? null,
      });
    }
    if (error) {
      const extra = isInvalidCredentials(debug, error.message) ? invalidCredentialsHint() : null;
      setMessage(extra ? `${error.message}\n\n${extra}` : error.message);
      if (extra && __DEV__) {
        appendAuthLog(setAuthLog, "hint", { invalidCredentials: true });
      }
      return;
    }
    if (__DEV__) {
      appendAuthLog(setAuthLog, "signIn", { ok: true, ...debug });
    }
  };

  const onSignUp = async () => {
    setMessage(null);
    setBusy(true);
    const { error, debug } = await signUp(email, password);
    setBusy(false);
    if (__DEV__) {
      appendAuthLog(setAuthLog, "signUp", {
        ...debug,
        error: error?.message ?? null,
      });
    }
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      debug.hasSession
        ? "Account created — you are signed in."
        : "Account created. If email confirmation is on, open the link in your email before signing in.",
    );
  };

  const onResetPassword = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      if (__DEV__) {
        appendAuthLog(setAuthLog, "resetPassword", { error: error.message });
      }
      return;
    }
    setMessage(
      "If that email is registered, Supabase sent a reset link. Under Authentication → URL Configuration, allow the redirect URL from your app (see Metro log [auth] resetPasswordForEmail) so the link opens correctly.",
    );
    if (__DEV__) {
      appendAuthLog(setAuthLog, "resetPassword", { ok: true });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-8 gap-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-lg font-semibold">Sign in or create an account</Text>

        <TextInput
          className="rounded-lg border px-3 py-3 text-base"
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View className="rounded-lg border flex-row items-stretch">
          <TextInput
            className="flex-1 min-w-0 px-3 py-3 text-base"
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            className="justify-center px-3 active:opacity-60"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityRole="button"
          >
            <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={24} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => void onResetPassword()}
          disabled={busy}
          className="self-start py-1 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Send password reset email"
        >
          <Text className="text-sm font-medium opacity-80">Forgot password — email reset link</Text>
        </Pressable>

        {message ? <Text className="text-sm opacity-80">{message}</Text> : null}

        <Pressable
          className="rounded-lg border py-3 items-center opacity-100 active:opacity-70"
          onPress={onSignIn}
          disabled={busy}
        >
          <Text className="text-base font-medium">Sign in</Text>
        </Pressable>

        <Pressable
          className="rounded-lg border py-3 items-center opacity-100 active:opacity-70"
          onPress={onSignUp}
          disabled={busy}
        >
          <Text className="text-base font-medium">Create account</Text>
        </Pressable>

        {busy ? <ActivityIndicator /> : null}

        {__DEV__ ? (
          <View className="mt-4 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs opacity-70">Auth debug log (dev only)</Text>
              <Pressable onPress={() => setAuthLog("")} className="py-1 active:opacity-60">
                <Text className="text-xs font-medium">Clear</Text>
              </Pressable>
            </View>
            <ScrollView
              nestedScrollEnabled
              className="max-h-48 rounded-lg border p-2"
              keyboardShouldPersistTaps="handled"
            >
              <Text selectable className="text-xs font-mono opacity-90">
                {authLog.trim() || "Sign in or sign up to append logs here; Metro also prints [auth] lines."}
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
