import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { verifyCustomerSession } from "@/lib/customerJwt";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    await connectDB();

    const cookie =
      req.cookies.get("customer_session")?.value ||
      req.cookies.get("client_session")?.value ||
      "";

    const sess = verifyCustomerSession(cookie);

    // ✅ 요청 메타 로그 (요청이 2번 들어오면 requestId가 2개 찍힘)
    console.log("[customer/checklist/list] IN", {
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      // 같은 브라우저에서 동시에 2번 들어오는지 보기 위해 짧게만 표시
      cookieLen: cookie?.length || 0,
      // 고객 식별 (민감하면 일부만)
      sub: sess?.sub ? String(sess.sub).slice(0, 6) + "..." : null,
      persona: sess?.persona ?? null,
      ua: req.headers.get("user-agent")?.slice(0, 60) ?? null,
      referer: req.headers.get("referer") ?? null,
    });

    if (!sess || sess.persona !== "customer") {
      console.log("[customer/checklist/list] OUT unauthorized", {
        requestId,
        ms: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "unauthorized", requestId },
        { status: 401 }
      );
    }

    const docs = await OnboardingFlow.find({ customerId: sess.sub })
      .sort({ createdAt: -1 })
      .lean();

    const items = (docs || []).map((f: any) => {
      const steps = Array.isArray(f.steps) ? f.steps : [];
      const stepsCount = steps.length;
      const doneCount = steps.filter((s: any) => s?.done === true).length;
      return {
        _id: String(f._id),
        customerName: f.customerName || "",
        destination: f.destination || "",
        nights: f.nights || 0,
        days: f.days || 0,
        departDate: f.departDate,
        stepsCount,
        doneCount,
      };
    });

    console.log("[customer/checklist/list] OUT ok", {
      requestId,
      ms: Date.now() - startedAt,
      count: items.length,
    });

    // ✅ 응답에도 requestId를 실어두면, 프론트에서 “진짜 2번 호출”인지 확인 가능
    return NextResponse.json({ ok: true, items, requestId });
  } catch (err: any) {
    console.error("[customer/checklist/list] OUT error", {
      requestId,
      ms: Date.now() - startedAt,
      message: err?.message,
    });
    return NextResponse.json(
      { ok: false, error: "server_error", requestId },
      { status: 500 }
    );
  }
}
