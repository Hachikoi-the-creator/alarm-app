import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  insertAlarm,
  listAlarms,
  supportsLocalAlarms,
  updateAlarm,
} from "@/lib/alarms";

function clampHour(n: number) {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(23, Math.max(0, Math.floor(n)));
}

function clampMinute(n: number) {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(59, Math.max(0, Math.floor(n)));
}

export default function EditAlarmScreen() {
  const insets = useSafeAreaInsets();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const isCreate = idParam == null || idParam === "";

  const safeAreaPad = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };

  const [loading, setLoading] = useState(!isCreate);
  const [title, setTitle] = useState("");
  const [hourStr, setHourStr] = useState("8");
  const [minuteStr, setMinuteStr] = useState("0");
  const [enabled, setEnabled] = useState(true);
  const [isRepeating, setIsRepeating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isCreate || !supportsLocalAlarms()) {
      setLoading(false);
      return;
    }
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const alarm = (await listAlarms()).find((a) => a.id === id);
      if (!alarm) {
        Alert.alert("Not found", "This alarm no longer exists.");
        router.back();
        return;
      }
      setTitle(alarm.title ?? "");
      setHourStr(String(alarm.hour));
      setMinuteStr(String(alarm.minute));
      setEnabled(alarm.enabled);
      setIsRepeating(alarm.isRepeating);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [idParam, isCreate]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    const hour = clampHour(Number(hourStr));
    const minute = clampMinute(Number(minuteStr));
    if (!supportsLocalAlarms()) {
      Alert.alert("Unavailable", "Alarms need the iOS or Android app.");
      return;
    }
    setSaving(true);
    try {
      if (isCreate) {
        await insertAlarm({
          title: title.trim() === "" ? null : title.trim(),
          hour,
          minute,
          enabled,
          isRepeating,
          repeatDays: null,
          customAlarmSequence: null,
        });
      } else {
        const id = Number(idParam);
        await updateAlarm(id, {
          title: title.trim() === "" ? null : title.trim(),
          hour,
          minute,
          enabled,
          isRepeating,
          repeatDays: null,
          customAlarmSequence: null,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!supportsLocalAlarms()) {
    return (
      <View className="flex-1 bg-background" style={safeAreaPad}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base">
            Alarms are available on iOS and Android in this build.
          </Text>
          <Pressable className="mt-4 rounded-lg border border-border px-4 py-2" onPress={() => router.back()}>
            <Text>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={safeAreaPad}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between py-2">
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text className="text-base">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold">{isCreate ? "New alarm" : "Edit alarm"}</Text>
            <Pressable onPress={() => void onSave()} disabled={saving || loading} hitSlop={12}>
              <Text
                className={
                  saving || loading ? "text-base font-medium opacity-50" : "text-base font-medium"
                }
              >
                Save
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator className="py-8" />
          ) : (
            <>
              <View className="gap-2">
                <Text className="text-sm opacity-80">Title</Text>
                <TextInput
                  className="rounded-lg border border-border px-3 py-3 text-base"
                  placeholder="Optional"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1 gap-2">
                  <Text className="text-sm opacity-80">Hour (0–23)</Text>
                  <TextInput
                    className="rounded-lg border border-border px-3 py-3 text-base"
                    keyboardType="number-pad"
                    value={hourStr}
                    onChangeText={setHourStr}
                  />
                </View>
                <View className="min-w-0 flex-1 gap-2">
                  <Text className="text-sm opacity-80">Minute (0–59)</Text>
                  <TextInput
                    className="rounded-lg border border-border px-3 py-3 text-base"
                    keyboardType="number-pad"
                    value={minuteStr}
                    onChangeText={setMinuteStr}
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-3">
                <Text className="text-base">Enabled</Text>
                <Switch value={enabled} onValueChange={setEnabled} />
              </View>

              <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-3">
                <Text className="text-base">Repeating</Text>
                <Switch value={isRepeating} onValueChange={setIsRepeating} />
              </View>

              <Pressable
                className="items-center rounded-lg border border-border py-3"
                onPress={() => void onSave()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator /> : <Text className="text-base font-medium">Save alarm</Text>}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
