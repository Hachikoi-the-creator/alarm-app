import type { ExpoConfig } from "expo/config";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expo } = require("./app.json") as { expo: ExpoConfig };

export default ({ config }: { config?: Partial<ExpoConfig> } = {}): ExpoConfig => ({
  ...expo,
  ...config,
  extra: {
    ...(typeof expo.extra === "object" && expo.extra !== null ? expo.extra : {}),
    ...(typeof config?.extra === "object" && config.extra !== null ? config.extra : {}),
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
  },
});
