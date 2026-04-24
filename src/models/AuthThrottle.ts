// src/models/AuthThrottle.ts
import { Schema, model, models } from "mongoose";

/**
 * 로그인 실패/잠금(Throttle) 저장용
 * key 예시:
 * - "admin:emailLower"
 * - "customer:loginIdLower"
 * - "land:emailLower"
 * - "ip:1.2.3.4"
 */
const AuthThrottleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },

    failCount: { type: Number, default: 0 },

    // 첫 실패 시각(레이트리밋 UX/분석용)
    firstFailAt: { type: Date, default: null },

    // 잠금 해제 시각(잠금 중이면 Date, 아니면 null)
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL: 마지막 업데이트 후 24시간 지나면 자동 삭제
AuthThrottleSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });
AuthThrottleSchema.index({ lockedUntil: 1 });

export const AuthThrottle =
  models.AuthThrottle || model("AuthThrottle", AuthThrottleSchema);
