import "../global.css";

import { Stack } from "expo-router";

import { AuthProvider } from "@/contexts/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
      </Stack>
    </AuthProvider>
  );
}
