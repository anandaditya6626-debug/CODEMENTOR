import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserStreakData {
  streak: number;
  lastStreakDate: string; // YYYY-MM-DD in local time
}

interface StatsState {
  hoursCoded: number; // in hours
  userStreaks: Record<string, UserStreakData>;
  addActiveTime: (minutes: number) => void;
  recordUserLoginStreak: (userId: string) => number;
  getUserStreak: (userId: string | null | undefined) => number;
  getUserLastActiveDate: (userId: string | null | undefined) => string | null;
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      hoursCoded: 0,
      userStreaks: {},

      addActiveTime: (minutes: number) => {
        set((state) => ({
          hoursCoded: state.hoursCoded + minutes / 60,
        }));
      },

      recordUserLoginStreak: (userId: string) => {
        if (!userId) return 0;
        const todayStr = getLocalDateString();
        const yesterdayStr = getYesterdayDateString();

        const currentMap = get().userStreaks || {};
        const userRecord = currentMap[userId];

        if (!userRecord) {
          // First time logging in: start at day 1
          const newRecord: UserStreakData = { streak: 1, lastStreakDate: todayStr };
          set((state) => ({
            userStreaks: { ...state.userStreaks, [userId]: newRecord },
          }));
          return 1;
        }

        if (userRecord.lastStreakDate === todayStr) {
          // Already logged in today, keep today's streak
          return userRecord.streak;
        }

        if (userRecord.lastStreakDate === yesterdayStr) {
          // Consecutive day login: increment streak (e.g. 1 -> 2, 2 -> 3)
          const newStreak = userRecord.streak + 1;
          const newRecord: UserStreakData = { streak: newStreak, lastStreakDate: todayStr };
          set((state) => ({
            userStreaks: { ...state.userStreaks, [userId]: newRecord },
          }));
          return newStreak;
        } else {
          // Missed one or more days: reset to day 1
          const newRecord: UserStreakData = { streak: 1, lastStreakDate: todayStr };
          set((state) => ({
            userStreaks: { ...state.userStreaks, [userId]: newRecord },
          }));
          return 1;
        }
      },

      getUserStreak: (userId: string | null | undefined) => {
        if (!userId) return 0;
        const record = get().userStreaks?.[userId];
        if (!record) return 0;

        const todayStr = getLocalDateString();
        const yesterdayStr = getYesterdayDateString();

        // If active today or yesterday, return current streak
        if (record.lastStreakDate === todayStr || record.lastStreakDate === yesterdayStr) {
          return record.streak;
        }

        // If older than yesterday, streak has expired
        return 0;
      },

      getUserLastActiveDate: (userId: string | null | undefined) => {
        if (!userId) return null;
        return get().userStreaks?.[userId]?.lastStreakDate || null;
      },
    }),
    {
      name: 'codementor-user-stats',
    }
  )
);
