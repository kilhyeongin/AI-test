// src/models/AuthLog.ts
import { Schema, model, models } from "mongoose";

/**
 * 인증 이벤트 로그
 * - 성공/실패, 사유, 대상 식별자(이메일/아이디), IP 등
 */
const AuthLogSchema = new Schema(
  {
    ts: { type: Date, default: () => new Date(), required: true }, // ✅ index: true 절대 넣지 않기
    persona: { type: String, enum: ["admin", "customer", "land"], required: true },
    action: { type: String, required: true }, // e.g. "login"
    ok: { type: Boolean, required: true },
    reason: { type: String }, // e.g. "invalid_credentials", "locked", ...
    key: { type: String }, // e.g. emailLower/loginIdLower/ip 등
    ip: { type: String },
    ua: { type: String },
    userId: { type: String }, // string(ObjectId) 저장용
  },
  { timestamps: true }
);

// ✅ 인덱스는 여기서만 선언 (중복 방지)
AuthLogSchema.index({ ts: -1 });
AuthLogSchema.index({ persona: 1, ts: -1 });
// TTL: 30일 후 자동 삭제
AuthLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const AuthLog = models.AuthLog || model("AuthLog", AuthLogSchema);
