// 관리자 초대 정보를 저장하는 Mongoose 모델 (이메일 코드 방식 포함)
// src/models/Invite.ts
import { Schema, model, models } from "mongoose";

const InviteSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    tenantId: { type: String, required: true },
    role: { type: String, enum: ["OWNER", "MANAGER", "STAFF"], required: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },

    // 이메일 인증코드 방식
    emailCode: { type: String },
    emailCodeExpiresAt: { type: Date },
  },
  { timestamps: true }
);

// ✅ named export (중요!)
export const Invite = models.Invite || model("Invite", InviteSchema);
