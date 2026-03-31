import type { Alarm, AlarmBackupV1 } from "@/lib/alarms/types";

export function buildAlarmBackupV1(alarms: Alarm[]): AlarmBackupV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    alarms: alarms.map((a) => ({
      title: a.title,
      hour: a.hour,
      minute: a.minute,
      enabled: a.enabled,
      isRepeating: a.isRepeating,
      repeatDays: a.repeatDays,
      customAlarmSequence: a.customAlarmSequence,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  };
}

export function parseAlarmBackupJson(text: string): AlarmBackupV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Backup must be a JSON object.");
  }
  const o = parsed as Record<string, unknown>;
  if (o.version !== 1) {
    throw new Error("Unsupported backup version.");
  }
  if (!Array.isArray(o.alarms)) {
    throw new Error("Backup is missing alarms.");
  }
  const alarms: AlarmBackupV1["alarms"] = [];
  for (const item of o.alarms) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const r = item as Record<string, unknown>;
    const hour = Number(r.hour);
    const minute = Number(r.minute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      throw new Error("Invalid alarm row (hour/minute).");
    }
    const createdAt = typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString();
    const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : createdAt;
    alarms.push({
      title: r.title == null ? null : String(r.title),
      hour,
      minute,
      enabled: r.enabled !== false,
      isRepeating: r.isRepeating === true,
      repeatDays: Array.isArray(r.repeatDays) ? r.repeatDays.map(String) : null,
      customAlarmSequence: Array.isArray(r.customAlarmSequence) ? r.customAlarmSequence : null,
      createdAt,
      updatedAt,
    });
  }
  return {
    version: 1,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : new Date().toISOString(),
    alarms,
  };
}
