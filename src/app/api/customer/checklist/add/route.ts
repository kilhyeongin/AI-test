import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { buildDefaultSteps } from "@/lib/onboardingDefaults";

export async function POST(req: NextRequest) {
  await connectDB();

  const cookie =
    req.cookies.get("customer_session")?.value ||
    req.cookies.get("client_session")?.value || "";
  const sess = verifyCustomerSession(cookie);
  if (!sess || sess.persona !== "customer") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {/* optional body */}

  const destination = String(body?.destination || "").trim();
  const nights = Number.isFinite(Number(body?.nights)) ? Number(body?.nights) : 0;
  const days = Number.isFinite(Number(body?.days)) ? Number(body?.days) : 0;

  let departDate: Date;
  if (body?.departDate) {
    const d = new Date(body.departDate);
    departDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    const today = new Date();
    departDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  const flow = await OnboardingFlow.create({
    customerId: sess.sub,
    customerName: (sess as any)?.name ?? "",
    customerEmail: (sess as any)?.email ?? "",
    destination,
    nights,
    days,
    departDate,
    steps: buildDefaultSteps(),
  });

  return NextResponse.json({ ok: true, flowId: String(flow._id) }, { status: 201 });
}
