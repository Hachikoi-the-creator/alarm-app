import Constants from "expo-constants";

export type AppExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export function getExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}
