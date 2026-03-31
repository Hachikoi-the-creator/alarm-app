import {
  cacheDirectory,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/auth-context";
import {
  buildAlarmBackupV1,
  downloadAlarmBackup,
  insertAlarm,
  listAlarms,
  parseAlarmBackupJson,
  replaceAlarmsFromBackup,
  supportsLocalAlarms,
  uploadAlarmBackup,
} from "@/lib/alarms";
import { getDocumentAsync } from "@/lib/pick-document";
import type { Alarm } from "@/lib/alarms/types";

function formatTime(hour: number, minute: number) {
  const h = hour % 24;
  const m = minute % 60;
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${hr}:${mm} ${am ? "AM" : "PM"}`;
}

export default function AlarmsTab() {
  const { user } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supportsLocalAlarms()) {
      return;
    }
    setError(null);
    try {
      const rows = await listAlarms();
      setAlarms(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAddSample = async () => {
    setBusy(true);
    setError(null);
    try {
      await insertAlarm({
        title: "Sample",
        hour: 7,
        minute: 0,
        enabled: true,
        isRepeating: false,
        repeatDays: null,
        customAlarmSequence: null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onBackupCloud = async () => {
    if (!user) {
      Alert.alert("Sign in required", "Sign in to save a cloud backup.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const rows = await listAlarms();
      const payload = buildAlarmBackupV1(rows);
      await uploadAlarmBackup(payload);
      Alert.alert("Backed up", "Your alarms are stored in the cloud for 30 days.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      Alert.alert("Backup failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const onRestoreCloud = async () => {
    if (!user) {
      Alert.alert("Sign in required", "Sign in to restore from the cloud.");
      return;
    }
    Alert.alert(
      "Replace local alarms?",
      "This will delete alarms on this device and replace them with your cloud backup.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const backup = await downloadAlarmBackup();
                await replaceAlarmsFromBackup(backup.alarms);
                await load();
                Alert.alert("Restored", "Local alarms were replaced from the cloud.");
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                Alert.alert("Restore failed", msg);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onExportJson = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await listAlarms();
      const payload = buildAlarmBackupV1(rows);
      const json = JSON.stringify(payload, null, 2);
      const dir = cacheDirectory;
      if (!dir) {
        throw new Error("Cache directory is not available.");
      }
      const path = `${dir}alarms-backup.json`;
      await writeAsStringAsync(path, json, { encoding: EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Export ready", `Saved to: ${path}`);
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: "application/json",
        dialogTitle: "Export alarms backup",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      Alert.alert("Export failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const onImportJson = async () => {
    Alert.alert(
      "Replace local alarms?",
      "This will delete alarms on this device and replace them from the JSON file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose file",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const pick = await getDocumentAsync({
                  type: "application/json",
                  copyToCacheDirectory: true,
                });
                if (pick.canceled || !pick.assets?.[0]) {
                  return;
                }
                const uri = pick.assets[0].uri;
                const text = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
                const backup = parseAlarmBackupJson(text);
                await replaceAlarmsFromBackup(backup.alarms);
                await load();
                Alert.alert("Imported", "Local alarms were replaced from the file.");
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                Alert.alert("Import failed", msg);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!supportsLocalAlarms()) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-base">
          Local alarms run on iOS and Android. Open this app on a device to use SQLite storage and
          backups.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-10">
      <Text className="text-xl font-semibold">Alarms</Text>
      <Text className="text-sm opacity-80">
        Data stays on this device. Cloud is optional: one backup per account, kept 30 days after each
        backup.
      </Text>

      {error ? <Text className="text-sm opacity-90">{error}</Text> : null}

      {busy ? <ActivityIndicator /> : null}

      <View className="flex-row flex-wrap gap-2">
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          onPress={onAddSample}
          disabled={busy}
        >
          <Text>Add sample alarm</Text>
        </Pressable>
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          onPress={onBackupCloud}
          disabled={busy}
        >
          <Text>Backup to cloud</Text>
        </Pressable>
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          onPress={onRestoreCloud}
          disabled={busy}
        >
          <Text>Restore from cloud</Text>
        </Pressable>
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          onPress={onExportJson}
          disabled={busy}
        >
          <Text>Export .json</Text>
        </Pressable>
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          onPress={onImportJson}
          disabled={busy}
        >
          <Text>Import .json</Text>
        </Pressable>
      </View>

      <Text className="text-sm font-medium">
        {user ? "Signed in — cloud backup available." : "Sign in to use cloud backup / restore."}
      </Text>

      <View className="gap-2">
        {alarms.length === 0 ? (
          <Text className="opacity-70">No alarms yet.</Text>
        ) : (
          alarms.map((a) => (
            <View key={a.id} className="rounded-lg border border-border p-3">
              <Text className="font-medium">{a.title ?? "Alarm"}</Text>
              <Text className="text-sm opacity-80">
                {formatTime(a.hour, a.minute)}
                {a.enabled ? "" : " · off"}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
