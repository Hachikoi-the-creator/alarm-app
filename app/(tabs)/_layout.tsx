import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";

export default function TabsLayout() {
  const { session, loading } = useAuth();

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

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alarms"
        options={{
          title: "Alarms",
          tabBarLabel: "Alarms",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="alarm" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: "Config",
          tabBarLabel: "Config",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
