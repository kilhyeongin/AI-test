import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await connectDB();

  const docs = await OnboardingFlow.find({})
    .sort({ departDate: 1 })
    .lean()
    .exec();

  return NextResponse.json({ ok: true, flows: docs });
}
