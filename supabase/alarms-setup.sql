CREATE TABLE alarms (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Basic info
    title               TEXT,                    -- "Morning Workout" or NULL
    hour                INTEGER NOT NULL,        -- 7
    minute              INTEGER NOT NULL,        -- 0
    enabled             BOOLEAN DEFAULT 1,       -- user can toggle
    
    -- Recurrence (super common need)
    is_repeating        BOOLEAN DEFAULT FALSE,   -- FALSE, TRUE
    repeat_days         TEXT[],                    -- ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    custom_alarm_sequence JSONB[],                    -- ["5", "4", "3"] (first time 5min, second time 4min, third time 3min)
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);