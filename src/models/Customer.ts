// src/models/Customer.ts
import { Schema, model, models } from "mongoose";

const CustomerSchema = new Schema(
  {
    // ✅ 로그인용 아이디 (표시용)
    loginId: { type: String, required: true },

    // ✅ 로그인용 아이디(소문자 정규화, 중복/조회용)
    loginIdLower: { type: String, required: true, index: true },

    // (선택) 이메일: 복구/알림용으로만 사용 (회원가입에서 안 받아도 됨)
    email: { type: String, required: false, default: "" },
    emailLower: { type: String, required: false, default: "" },

    name: { type: String, required: true },
    passwordHash: { type: String },

    persona: { type: String, enum: ["customer"], default: "customer", required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    sessionVersion: { type: Number, default: 0 },
    orgName: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.pre("validate", function (next) {
  // @ts-ignore
  if (this.loginId) this.loginIdLower = String(this.loginId).trim().toLowerCase();

  // @ts-ignore
  if (this.email) this.emailLower = String(this.email).trim().toLowerCase();
  next();
});

// ✅ 아이디는 반드시 유니크
CustomerSchema.index({ loginIdLower: 1 }, { unique: true });

// ✅ 이메일은 선택일 수 있으므로 sparse unique (값 있을 때만 유니크 강제)
CustomerSchema.index({ emailLower: 1 }, { unique: true, sparse: true });

export const Customer = models.Customer || model("Customer", CustomerSchema);
