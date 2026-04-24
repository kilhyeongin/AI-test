// src/models/User.ts
// 관리자 모델 (컬렉션: users)
import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    // 원본 이메일(표시용)
    email: { type: String, required: true, index: true },

    // 소문자로 정규화된 이메일(중복/로그인 조회용)
    emailLower: { type: String, required: true, index: true, unique: true },

    // 표시 이름(필수)
    name: { type: String, required: true },

    // 비밀번호 해시
    passwordHash: { type: String },

    // ✅ persona (세션 로직과 정합성 맞춤)
    // - 기존 DB에 값이 없으면 default("admin")로 간주
    persona: { type: String, enum: ["admin", "customer"], default: "admin" },

    // 권한(관리자용)
    roles: { type: [String], default: [] }, // OWNER/MANAGER/STAFF

    // 상태
    status: { type: String, enum: ["active", "disabled"], default: "active" },

    // 비번 변경/초기화 시 증가
    sessionVersion: { type: Number, default: 0 },

    // (선택) 소속명 정도만 메모용으로 둘 수 있음
    orgName: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_d, r) {
        delete r.passwordHash;
        return r;
      },
    },
  }
);

UserSchema.pre("validate", function (next) {
  // @ts-ignore
  if (this.email) this.emailLower = String(this.email).trim().toLowerCase();
  next();
});

export const User = models.User || model("User", UserSchema);
