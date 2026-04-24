// 관리자 활동 로그 모델
import { Schema, model, models } from "mongoose";

const AdminLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actorEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, ref: "User" },
  targetEmail: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 조회용 인덱스
AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ actorId: 1, createdAt: -1 });
// TTL: 90일 후 자동 삭제
AdminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const AdminLog = models.AdminLog || model("AdminLog", AdminLogSchema);
