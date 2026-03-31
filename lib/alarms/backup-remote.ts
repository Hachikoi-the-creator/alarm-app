/**
 * Only module that calls Postgres (user_backups). Alarms stay on-device; no other
 * `supabase.from(...)` usage in the app—keeps DB usage to manual backup/restore.
 */
import { supabase } from "@/lib/supabase";

import type { AlarmBackupV1 } from "@/lib/alarms/types";

type UserBackupRow = {
  backup_data: unknown;
  expires_at: string;
};

async function sessionUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const user = data.session?.user;
  if (!user) {
    throw new Error("Sign in to use cloud backup.");
  }
  return user.id;
}

export async function uploadAlarmBackup(payload: AlarmBackupV1): Promise<void> {
  const userId = await sessionUserId();
  const { error } = await supabase.from("user_backups").upsert(
    {
      user_id: userId,
      backup_data: payload,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw error;
  }
}

export async function downloadAlarmBackup(): Promise<AlarmBackupV1> {
  const userId = await sessionUserId();
  const { data, error } = await supabase
    .from("user_backups")
    .select("backup_data, expires_at")
    .eq("user_id", userId)
    .maybeSingle<UserBackupRow>();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("No cloud backup found.");
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("This cloud backup has expired (30 days). Create a new backup.");
  }
  const raw = data.backup_data;
  if (!raw || typeof raw !== "object") {
    throw new Error("Cloud backup data is empty.");
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.alarms)) {
    throw new Error("Cloud backup format is invalid.");
  }
  return raw as AlarmBackupV1;
}
