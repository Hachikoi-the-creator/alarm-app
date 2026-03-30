import { Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/auth-context";

export default function Index() {
  const { session, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  const onSignIn = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
  };

  const onSignUp = async () => {
    setMessage(null);
    setBusy(true);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Account created. If email confirmation is on, check your inbox; otherwise sign in.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <View className="flex-1 justify-center px-6 gap-4">
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

        <TextInput
          className="rounded-lg border px-3 py-3 text-base"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

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
      </View>
    </KeyboardAvoidingView>
  );
}
