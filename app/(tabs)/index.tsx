import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteAlarm,
  listAlarms,
  setAlarmEnabled,
  supportsLocalAlarms,
} from "@/lib/alarms";
import type { Alarm } from "@/lib/alarms/types";

function formatTime(hour: number, minute: number) {
  const h = hour % 24;
  const m = minute % 60;
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${hr}:${mm} ${am ? "AM" : "PM"}`;
}

function sortAlarms(a: Alarm, b: Alarm) {
  if (a.hour !== b.hour) {
    return a.hour - b.hour;
  }
  if (a.minute !== b.minute) {
    return a.minute - b.minute;
  }
  return a.id - b.id;
}

function AlarmRow({
  alarm,
  interactionsDisabled,
  onToggleEnabled,
  onEdit,
  onDeleteRequest,
}: {
  alarm: Alarm;
  interactionsDisabled: boolean;
  onToggleEnabled: (id: number, value: boolean) => void;
  onEdit: (id: number) => void;
  onDeleteRequest: (a: Alarm) => void;
}) {
  return (
    <View className="gap-2 rounded-lg border border-border p-3">
      <View>
        <Text className="font-medium" numberOfLines={2}>
          {alarm.title ?? "Alarm"}
        </Text>
        <Text className="text-sm opacity-70">{formatTime(alarm.hour, alarm.minute)}</Text>
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <Switch
          value={alarm.enabled}
          disabled={interactionsDisabled}
          onValueChange={(v) => onToggleEnabled(alarm.id, v)}
        />
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          disabled={interactionsDisabled}
          onPress={() => onEdit(alarm.id)}
          hitSlop={6}
        >
          <Text className="text-sm">Edit</Text>
        </Pressable>
        <Pressable
          className="rounded-lg border border-border px-3 py-2"
          disabled={interactionsDisabled}
          onPress={() => onDeleteRequest(alarm)}
          hitSlop={6}
        >
          <Text className="text-sm">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AlarmSection({
  heading,
  alarms,
  expanded,
  onToggleExpanded,
  maxExpandedHeight,
  interactionsDisabled,
  onToggleEnabled,
  onEdit,
  onDeleteRequest,
}: {
  heading: string;
  alarms: Alarm[];
  expanded: boolean;
  onToggleExpanded: () => void;
  maxExpandedHeight: number;
  interactionsDisabled: boolean;
  onToggleEnabled: (id: number, value: boolean) => void;
  onEdit: (id: number) => void;
  onDeleteRequest: (a: Alarm) => void;
}) {
  const showExpandControl = alarms.length > 3;
  const shown = expanded ? alarms : alarms.slice(0, 3);

  return (
    <View className="gap-2">
      <Text className="text-base font-semibold">{heading}</Text>
      {alarms.length === 0 ? (
        <Text className="py-1 text-sm opacity-60">None</Text>
      ) : expanded ? (
        <>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: maxExpandedHeight }}
            contentContainerClassName="gap-2"
            showsVerticalScrollIndicator
          >
            {alarms.map((a) => (
              <AlarmRow
                key={a.id}
                alarm={a}
                interactionsDisabled={interactionsDisabled}
                onToggleEnabled={onToggleEnabled}
                onEdit={onEdit}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </ScrollView>
          {showExpandControl ? (
            <Pressable onPress={onToggleExpanded} hitSlop={8}>
              <Text className="text-sm opacity-80 underline">Show less</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <View className="gap-2">
            {shown.map((a) => (
              <AlarmRow
                key={a.id}
                alarm={a}
                interactionsDisabled={interactionsDisabled}
                onToggleEnabled={onToggleEnabled}
                onEdit={onEdit}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </View>
          {showExpandControl ? (
            <Pressable onPress={onToggleExpanded} hitSlop={8}>
              <Text className="text-sm opacity-80 underline">Show all ({alarms.length})</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const halfScreen = height * 0.5;

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandActive, setExpandActive] = useState(false);
  const [expandInactive, setExpandInactive] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Alarm | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supportsLocalAlarms()) {
      setAlarms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listAlarms();
      setAlarms(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const activeAlarms = useMemo(
    () => alarms.filter((a) => a.enabled).sort(sortAlarms),
    [alarms],
  );
  const inactiveAlarms = useMemo(
    () => alarms.filter((a) => !a.enabled).sort(sortAlarms),
    [alarms],
  );

  const onToggleEnabled = async (id: number, value: boolean) => {
    if (!supportsLocalAlarms()) {
      return;
    }
    setBusy(true);
    try {
      await setAlarmEnabled(id, value);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onEdit = (id: number) => {
    router.push({ pathname: "/edit-alarm", params: { id: String(id) } });
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !supportsLocalAlarms()) {
      setPendingDelete(null);
      return;
    }
    const id = pendingDelete.id;
    setPendingDelete(null);
    setBusy(true);
    try {
      await deleteAlarm(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const safeTop = { paddingTop: insets.top };

  if (!supportsLocalAlarms()) {
    return (
      <View className="flex-1 bg-background" style={safeTop}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base">
            Open this app on iOS or Android to manage alarms on your device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={safeTop}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-10"
        nestedScrollEnabled
      >
        <Text className="text-2xl font-bold">best alarm app</Text>

        <Pressable
          className="items-center rounded-lg border border-border py-3"
          onPress={() => router.push("/edit-alarm")}
        >
          <Text className="text-base font-semibold">Create alarm</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <AlarmSection
              heading="Active alarms"
              alarms={activeAlarms}
              expanded={expandActive}
              onToggleExpanded={() => setExpandActive((v) => !v)}
              maxExpandedHeight={halfScreen}
              interactionsDisabled={busy}
              onToggleEnabled={onToggleEnabled}
              onEdit={onEdit}
              onDeleteRequest={setPendingDelete}
            />
            <AlarmSection
              heading="Deactivated alarms"
              alarms={inactiveAlarms}
              expanded={expandInactive}
              onToggleExpanded={() => setExpandInactive((v) => !v)}
              maxExpandedHeight={halfScreen}
              interactionsDisabled={busy}
              onToggleEnabled={onToggleEnabled}
              onEdit={onEdit}
              onDeleteRequest={setPendingDelete}
            />
          </>
        )}

        {busy ? <ActivityIndicator /> : null}
      </ScrollView>

      <Modal visible={pendingDelete != null} transparent animationType="fade">
        <View className="flex-1 justify-center px-4">
          <Pressable
            accessibilityRole="button"
            className="absolute inset-0 bg-background"
            style={{ opacity: 0.55 }}
            onPress={() => setPendingDelete(null)}
          />
          <View className="rounded-xl border border-border bg-background p-4">
            <Text className="mb-2 text-lg font-semibold">Delete alarm?</Text>
            <Text className="mb-4 opacity-80">
              {pendingDelete
                ? `"${pendingDelete.title ?? "Alarm"}" will be removed from this device.`
                : ""}
            </Text>
            <View className="flex-row justify-end gap-3">
              <Pressable
                className="rounded-lg border border-border px-4 py-2"
                onPress={() => setPendingDelete(null)}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable
                className="rounded-lg border border-border px-4 py-2"
                onPress={() => void confirmDelete()}
              >
                <Text>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
