import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import type { Alarm, AlarmBackupV1 } from "@/lib/alarms/types";

type AlarmBackupV1Alarm = AlarmBackupV1["alarms"][number];

const DB_NAME = "alarms.db";

type AlarmRow = {
  id: number;
  title: string | null;
  hour: number;
  minute: number;
  enabled: number;
  is_repeating: number;
  repeat_days_json: string | null;
  custom_alarm_sequence_json: string | null;
  created_at: string;
  updated_at: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function supportsLocalAlarms() {
  return Platform.OS !== "web";
}

function parseStringArray(json: string | null): string[] | null {
  if (json == null || json === "") {
    return null;
  }
  try {
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) {
      return null;
    }
    return v.map((x) => String(x));
  } catch {
    return null;
  }
}

function parseUnknownArray(json: string | null): unknown[] | null {
  if (json == null || json === "") {
    return null;
  }
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function rowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    title: row.title,
    hour: row.hour,
    minute: row.minute,
    enabled: row.enabled !== 0,
    isRepeating: row.is_repeating !== 0,
    repeatDays: parseStringArray(row.repeat_days_json),
    customAlarmSequence: parseUnknownArray(row.custom_alarm_sequence_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nowIso() {
  return new Date().toISOString();
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  if (!supportsLocalAlarms()) {
    throw new Error("Local alarms require the iOS or Android app.");
  }
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_repeating INTEGER NOT NULL DEFAULT 0,
      repeat_days_json TEXT,
      custom_alarm_sequence_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function getAlarmsDb() {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

export async function listAlarms(): Promise<Alarm[]> {
  const db = await getAlarmsDb();
  const rows = await db.getAllAsync<AlarmRow>(
    `SELECT id, title, hour, minute, enabled, is_repeating,
            repeat_days_json, custom_alarm_sequence_json, created_at, updated_at
     FROM alarms ORDER BY hour ASC, minute ASC, id ASC`,
  );
  return rows.map(rowToAlarm);
}

export async function insertAlarm(input: {
  title?: string | null;
  hour: number;
  minute: number;
  enabled?: boolean;
  isRepeating?: boolean;
  repeatDays?: string[] | null;
  customAlarmSequence?: unknown[] | null;
}): Promise<number> {
  const db = await getAlarmsDb();
  const t = nowIso();
  const repeatJson =
    input.repeatDays && input.repeatDays.length > 0 ? JSON.stringify(input.repeatDays) : null;
  const seqJson =
    input.customAlarmSequence && input.customAlarmSequence.length > 0
      ? JSON.stringify(input.customAlarmSequence)
      : null;
  const result = await db.runAsync(
    `INSERT INTO alarms (
      title, hour, minute, enabled, is_repeating,
      repeat_days_json, custom_alarm_sequence_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title ?? null,
      input.hour,
      input.minute,
      input.enabled === false ? 0 : 1,
      input.isRepeating ? 1 : 0,
      repeatJson,
      seqJson,
      t,
      t,
    ],
  );
  return Number(result.lastInsertRowId);
}

export async function getAlarmById(id: number): Promise<Alarm | null> {
  const db = await getAlarmsDb();
  const row = await db.getFirstAsync<AlarmRow>(
    `SELECT id, title, hour, minute, enabled, is_repeating,
            repeat_days_json, custom_alarm_sequence_json, created_at, updated_at
     FROM alarms WHERE id = ?`,
    [id],
  );
  return row ? rowToAlarm(row) : null;
}

export async function setAlarmEnabled(id: number, enabled: boolean): Promise<void> {
  const db = await getAlarmsDb();
  await db.runAsync(`UPDATE alarms SET enabled = ?, updated_at = ? WHERE id = ?`, [
    enabled ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export async function updateAlarm(
  id: number,
  input: {
    title: string | null;
    hour: number;
    minute: number;
    enabled: boolean;
    isRepeating: boolean;
    repeatDays: string[] | null;
    customAlarmSequence: unknown[] | null;
  },
): Promise<void> {
  const db = await getAlarmsDb();
  const repeatJson =
    input.repeatDays && input.repeatDays.length > 0 ? JSON.stringify(input.repeatDays) : null;
  const seqJson =
    input.customAlarmSequence && input.customAlarmSequence.length > 0
      ? JSON.stringify(input.customAlarmSequence)
      : null;
  await db.runAsync(
    `UPDATE alarms SET
      title = ?, hour = ?, minute = ?, enabled = ?, is_repeating = ?,
      repeat_days_json = ?, custom_alarm_sequence_json = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.title,
      input.hour,
      input.minute,
      input.enabled ? 1 : 0,
      input.isRepeating ? 1 : 0,
      repeatJson,
      seqJson,
      nowIso(),
      id,
    ],
  );
}

export async function deleteAlarm(id: number): Promise<void> {
  const db = await getAlarmsDb();
  await db.runAsync(`DELETE FROM alarms WHERE id = ?`, [id]);
}

export async function deleteAllAlarms(): Promise<void> {
  const db = await getAlarmsDb();
  await db.runAsync(`DELETE FROM alarms`);
}

export async function replaceAlarmsFromBackup(alarms: AlarmBackupV1Alarm[]): Promise<void> {
  const db = await getAlarmsDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM alarms`);
    for (const a of alarms) {
      const repeatJson =
        a.repeatDays && a.repeatDays.length > 0 ? JSON.stringify(a.repeatDays) : null;
      const seqJson =
        a.customAlarmSequence && a.customAlarmSequence.length > 0
          ? JSON.stringify(a.customAlarmSequence)
          : null;
      await db.runAsync(
        `INSERT INTO alarms (
          title, hour, minute, enabled, is_repeating,
          repeat_days_json, custom_alarm_sequence_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.title,
          a.hour,
          a.minute,
          a.enabled ? 1 : 0,
          a.isRepeating ? 1 : 0,
          repeatJson,
          seqJson,
          a.createdAt,
          a.updatedAt,
        ],
      );
    }
  });
}
