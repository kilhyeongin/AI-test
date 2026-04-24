// src/lib/authThrottle.ts
import { connectDB } from "@/lib/db";
import { AuthThrottle } from "@/models/AuthThrottle";

const MAX_FAIL = 5;        // 계정 기준 5회
const LOCK_MINUTES = 10;   // 10분 잠금

const IP_MAX_FAIL = 30;       // IP 기준 30회 (조정 가능)
const IP_LOCK_MINUTES = 10;   // IP 잠금 10분

function now() {
  return new Date();
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

export function makeThrottleKey(
  persona: "admin" | "customer" | "land",
  identifierLower: string
) {
  return `${persona}:${identifierLower}`;
}

// ✅ IP 단위 key (persona 구분 포함)
export function makeIpThrottleKey(
  persona: "admin" | "customer" | "land",
  ip: string
) {
  return `${persona}:ip:${ip}`;
}

export async function isLocked(key: string) {
  await connectDB();

  const row = await AuthThrottle.findOne({ key }).lean<{ lockedUntil?: Date | null } | null>();
  if (!row?.lockedUntil) return { locked: false as const };

  const locked = row.lockedUntil.getTime() > Date.now();
  return locked ? { locked: true as const, lockedUntil: row.lockedUntil } : { locked: false as const };
}

async function recordFailInternal(key: string, maxFail: number, lockMinutes: number) {
  await connectDB();
  const t = now();

  const row = await AuthThrottle.findOneAndUpdate(
    { key },
    {
      $setOnInsert: { firstFailAt: t, lockedUntil: null },
      $inc: { failCount: 1 },
      $set: { updatedAt: t },
    },
    { upsert: true, new: true }
  ).lean<{ failCount: number; lockedUntil: Date | null } | null>();

  if (!row) return { locked: false as const };

  if (row.failCount >= maxFail) {
    const until = addMinutes(t, lockMinutes);
    await AuthThrottle.updateOne({ key }, { $set: { lockedUntil: until, updatedAt: t } });
    return { locked: true as const, lockedUntil: until };
  }

  return { locked: false as const };
}

export async function recordFail(key: string) {
  return recordFailInternal(key, MAX_FAIL, LOCK_MINUTES);
}

export async function recordIpFail(key: string) {
  return recordFailInternal(key, IP_MAX_FAIL, IP_LOCK_MINUTES);
}

export async function resetThrottle(key: string) {
  await connectDB();
  await AuthThrottle.deleteOne({ key });
}
