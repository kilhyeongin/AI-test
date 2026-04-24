// src/models/LandAgency.ts
import { Schema, model, models } from "mongoose";

const LandAgencySchema = new Schema(
  {
    landName: { type: String, required: true },          // 랜드사 이름
    ownerName: { type: String, required: true },         // 대표명
    phone: { type: String, required: true },

    // 원본 이메일(표시용)
    email: { type: String, required: true },

    // ✅ 소문자 정규화 이메일(조회/중복/로그인용)
    emailLower: { type: String, required: true, index: true },

    homepage: { type: String, default: "" },
    businessRegNo: { type: String, required: true },
    businessRegFileUrl: { type: String, required: true },

    passwordHash: { type: String, required: true },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    // ✅ 세션 무효화(강제 로그아웃/비번변경 시 증가)
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LandAgencySchema.pre("validate", function (next) {
  // @ts-ignore
  if (this.email) this.emailLower = String(this.email).trim().toLowerCase();
  next();
});

// ✅ 정규화 이메일 기준 유니크 (기존 email unique보다 운영이 안정적)
LandAgencySchema.index({ emailLower: 1 }, { unique: true });

export const LandAgency =
  models.LandAgency || model("LandAgency", LandAgencySchema);
