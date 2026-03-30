import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";

export default function ConfigTab() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="text-xl font-semibold">Config</Text>
      <Pressable
        className="rounded-lg border px-4 py-3 active:opacity-70"
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        <Text className="text-base font-medium">Sign out</Text>
      </Pressable>
    </View>
  );
}
