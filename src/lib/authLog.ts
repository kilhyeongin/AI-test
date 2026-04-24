// src/lib/authLog.ts
import { connectDB } from "@/lib/db";
import { AuthLog } from "@/models/AuthLog";

export async function writeAuthLog(input: {
  persona: "admin" | "customer" | "land";
  action: "login_success" | "login_fail" | "logout";
  identifier?: string;
  userId?: string;
  ip?: string;
  ua?: string;
  reason?: string;
}) {
  try {
    await connectDB();
    await AuthLog.create({
      persona: input.persona,
      action: input.action,
      identifier: input.identifier ?? "",
      userId: input.userId ?? "",
      ip: input.ip ?? "",
      ua: input.ua ?? "",
      reason: input.reason ?? "",
    });
  } catch {
    // 로깅 실패로 인증 흐름이 깨지면 안 되므로 무시
  }
}
