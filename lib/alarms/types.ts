export type Alarm = {
  id: number;
  title: string | null;
  hour: number;
  minute: number;
  enabled: boolean;
  isRepeating: boolean;
  repeatDays: string[] | null;
  customAlarmSequence: unknown[] | null;
  createdAt: string;
  updatedAt: string;
};

/** Portable JSON backup (v1). Ids are reassigned on restore. */
export type AlarmBackupV1 = {
  version: 1;
  exportedAt: string;
  alarms: Array<{
    title: string | null;
    hour: number;
    minute: number;
    enabled: boolean;
    isRepeating: boolean;
    repeatDays: string[] | null;
    customAlarmSequence: unknown[] | null;
    createdAt: string;
    updatedAt: string;
  }>;
};
