import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";

export default function Dashboard() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  const displayName =
    profile?.display_name?.trim() ||
    session.user.email?.split("@")[0] ||
    "User";

  return (
    <View className="flex-1 justify-center px-6 gap-6">
      <Text className="text-xl font-semibold">Hello, {displayName}</Text>
      <Text className="text-base opacity-80">{session.user.email}</Text>

      <Pressable
        className="self-start rounded-lg border px-4 py-3 active:opacity-70"
        onPress={() => void signOut()}
      >
        <Text className="text-base font-medium">Sign out</Text>
      </Pressable>
    </View>
  );
}
