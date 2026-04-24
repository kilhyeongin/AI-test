// /src/app/api/onboarding/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { verifyAdminSession } from "@/lib/jwt";
import { Types } from "mongoose";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
});

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pathKey = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    return pathKey || null;
  } catch {
    return null;
  }
}

async function deleteManyFromS3(keys: string[]) {
  if (!S3_BUCKET || !AWS_REGION) return;

  await Promise.allSettled(
    keys.map(async (key) => {
      if (!key) return;
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET!, Key: key }));
        console.log("🧹 Deleted from S3:", key);
      } catch (e) {
        console.warn("⚠️ S3 delete failed:", (e as any)?.message || e);
      }
    })
  );
}

/** ▽ 공통: file 정보 정규화 */
function normalizeFile(raw: any) {
  if (!raw) raw = {};

  const s3Key: string | null = raw.s3Key || raw.key || raw.objectKey || null;
  let url: string = raw.url || raw.Location || raw.location || "";

  // url이 없고 s3Key만 있을 때 → S3_PUBLIC_BASE로 유추
  if (!url && s3Key && process.env.S3_PUBLIC_BASE) {
    const base = process.env.S3_PUBLIC_BASE.replace(/\/+$/, "");
    url = `${base}/${s3Key}`;
  }

  const name: string =
    raw.name ||
    raw.filename ||
    (s3Key ? s3Key.split("/").pop() || "파일" : "파일");

  return { name, url, s3Key };
}

/** ✅ 업로드 (등록만 — 덮어쓰기 없음) */
export async function POST(req: NextRequest) {
  await connectDB();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const {
    customerId: rawCustomerId,
    flowId: rawFlowId,
    order: rawOrder,
    actor: rawActor,
    subKey,
    file: rawFile,
  } = body || {};

  const customerId = String(rawCustomerId || "").trim();
  const flowId = rawFlowId ? String(rawFlowId).trim() : "";
  const order = Number(rawOrder);
  const actorIn = String(rawActor || "").toLowerCase();
  const actor: "customer" | "admin" = actorIn === "admin" ? "admin" : "customer";

  if (!customerId && !flowId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (!Number.isFinite(order)) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const file = normalizeFile(rawFile);

  // ✅ s3Key가 없고 url만 있으면 url에서 key라도 최대한 뽑아준다 (레거시/프론트 실수 대비)
  const ensuredS3Key = file.s3Key || (file.url ? extractS3KeyFromUrl(file.url) : null);

  // 세션 인증
  const adminCookie = req.cookies.get("admin_session")?.value || "";
  const customerCookie =
    req.cookies.get("customer_session")?.value ||
    req.cookies.get("client_session")?.value ||
    "";
  const adminSess = verifyAdminSession(adminCookie);
  const customerSess = verifyCustomerSession(customerCookie);

  if (actor === "admin") {
    if (!adminSess) {
      return NextResponse.json({ ok: false, error: "unauthorized_admin" }, { status: 401 });
    }
  } else {
    if (!customerSess || customerSess.persona !== "customer") {
      return NextResponse.json({ ok: false, error: "unauthorized_customer" }, { status: 401 });
    }
    if (customerId && String(customerSess.sub) !== customerId) {
      return NextResponse.json({ ok: false, error: "forbidden_customer" }, { status: 403 });
    }
  }

  const uploaderName =
    actor === "admin"
      ? ((adminSess as any)?.name || (adminSess as any)?.email || "관리자")
      : ((customerSess as any)?.name || "고객");

  // 플로우 찾기: flowId 우선 → 없으면 customerId
  let flow: any = null;
  if (flowId) {
    if (!Types.ObjectId.isValid(flowId)) {
      return NextResponse.json({ ok: false, error: "invalid_flow_id" }, { status: 400 });
    }
    flow = await OnboardingFlow.findById(flowId);
  } else {
    if (!Types.ObjectId.isValid(customerId)) {
      return NextResponse.json({ ok: false, error: "invalid_customer_id" }, { status: 400 });
    }
    flow = await OnboardingFlow.findOne({ customerId });
  }

  if (!flow) return NextResponse.json({ ok: false, error: "flow_not_found" }, { status: 404 });

  if (actor === "customer" && customerSess) {
    if (String(flow.customerId) !== String(customerSess.sub)) {
      return NextResponse.json(
        { ok: false, error: "forbidden_customer_flow" },
        { status: 403 }
      );
    }
  }

  const step: any = flow.steps.find((s: any) => s.order === order);
  if (!step) return NextResponse.json({ ok: false, error: "step_not_found" }, { status: 404 });

  try {
    if (step.kind === "ADMIN_UPLOAD_VIEW") {
      if (actor !== "admin") {
        return NextResponse.json(
          { ok: false, error: "only_admin_can_upload_here" },
          { status: 403 }
        );
      }

      step.filesAdmin = step.filesAdmin || [];
      step.filesAdmin.push({
        name: file.name,
        url: file.url,
        s3Key: ensuredS3Key, // ✅ 저장
        uploadedAt: new Date(),
        uploadedBy: "admin",
        uploadedByName: uploaderName,
      });
      step.done = true;
    } else if (step.kind === "CLIENT_UPLOAD_REVIEW") {
      const uploader: "admin" | "customer" = actor === "admin" ? "admin" : "customer";

      step.filesCustomer = step.filesCustomer || [];
      step.filesCustomer.push({
        name: file.name,
        url: file.url,
        s3Key: ensuredS3Key, // ✅ 저장
        uploadedAt: new Date(),
        uploadedBy: uploader,
        uploadedByName: uploaderName,
      });
      step.done = true;
    } else if (step.kind === "PAYMENT_PIPELINE") {
      if (!subKey) {
        return NextResponse.json({ ok: false, error: "subKey_required" }, { status: 400 });
      }
      const sub = (step.subtasks || []).find((t: any) => t.key === subKey);
      if (!sub) return NextResponse.json({ ok: false, error: "subtask_not_found" }, { status: 404 });
      if (sub.role !== actor) return NextResponse.json({ ok: false, error: "role_mismatch" }, { status: 403 });

      sub.files = sub.files || [];
      sub.files.push({
        name: file.name,
        url: file.url,
        s3Key: ensuredS3Key, // ✅ 저장
        uploadedAt: new Date(),
        uploadedBy: actor,
        uploadedByName: uploaderName,
      });

      if (actor === "customer") sub.status = "done";
      step.done = (step.subtasks || []).every((t: any) => t.status === "done");
    } else {
      return NextResponse.json({ ok: false, error: "unknown_step_kind" }, { status: 400 });
    }

    await flow.save();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ Upload route error:", e);
    return NextResponse.json(
      { ok: false, error: "internal_error", debug: e?.message || String(e) },
      { status: 500 }
    );
  }
}

/** ✅ 삭제(버튼 클릭 시 S3 포함 완전 삭제) */
export async function DELETE(req: NextRequest) {
  await connectDB();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { customerId, flowId: rawFlowId, order, actor: rawActor, subKey, fileUrl, fileKey } = body || {};
  const actorIn = String(rawActor || "").toLowerCase();
  const actor: "customer" | "admin" = actorIn === "admin" ? "admin" : "customer";
  const flowId = rawFlowId ? String(rawFlowId).trim() : "";

  if (!customerId && !flowId) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  if (!order || !fileUrl) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });

  const adminCookie = req.cookies.get("admin_session")?.value || "";
  const customerCookie =
    req.cookies.get("customer_session")?.value ||
    req.cookies.get("client_session")?.value ||
    "";
  const adminSess = verifyAdminSession(adminCookie);
  const customerSess = verifyCustomerSession(customerCookie);

  if (actor === "admin") {
    if (!adminSess) return NextResponse.json({ ok: false, error: "unauthorized_admin" }, { status: 401 });
  } else {
    if (!customerSess || customerSess.persona !== "customer") {
      return NextResponse.json({ ok: false, error: "unauthorized_customer" }, { status: 401 });
    }
    if (customerId && String(customerSess.sub) !== String(customerId)) {
      return NextResponse.json({ ok: false, error: "forbidden_customer" }, { status: 403 });
    }
  }

  let flow: any = null;
  if (flowId) {
    if (!Types.ObjectId.isValid(flowId)) return NextResponse.json({ ok: false, error: "invalid_flow_id" }, { status: 400 });
    flow = await OnboardingFlow.findById(flowId);
  } else {
    if (!Types.ObjectId.isValid(customerId)) return NextResponse.json({ ok: false, error: "invalid_customer_id" }, { status: 400 });
    flow = await OnboardingFlow.findOne({ customerId });
  }
  if (!flow) return NextResponse.json({ ok: false, error: "flow_not_found" }, { status: 404 });

  if (actor === "customer" && customerSess) {
    if (String(flow.customerId) !== String(customerSess.sub)) {
      return NextResponse.json({ ok: false, error: "forbidden_customer_flow" }, { status: 403 });
    }
  }

  const step: any = flow.steps.find((s: any) => s.order === Number(order));
  if (!step) return NextResponse.json({ ok: false, error: "step_not_found" }, { status: 404 });

  try {
    let removeKey: string | null = fileKey || null;

    if (step.kind === "ADMIN_UPLOAD_VIEW") {
      step.filesAdmin = (step.filesAdmin || []).filter((f: any) => {
        if (f.url === fileUrl) removeKey = f.s3Key || removeKey;
        return f.url !== fileUrl;
      });
      step.done = (step.filesAdmin || []).length > 0;
    } else if (step.kind === "CLIENT_UPLOAD_REVIEW") {
      step.filesCustomer = (step.filesCustomer || []).filter((f: any) => {
        if (f.url === fileUrl) removeKey = f.s3Key || removeKey;
        return f.url !== fileUrl;
      });
      step.done = (step.filesCustomer || []).length > 0;
    } else if (step.kind === "PAYMENT_PIPELINE") {
      if (!subKey) return NextResponse.json({ ok: false, error: "subKey_required" }, { status: 400 });
      const sub = (step.subtasks || []).find((s: any) => s.key === subKey);
      if (!sub) return NextResponse.json({ ok: false, error: "subtask_not_found" }, { status: 404 });

      sub.files = (sub.files || []).filter((f: any) => {
        if (f.url === fileUrl) removeKey = f.s3Key || removeKey;
        return f.url !== fileUrl;
      });

      if (actor === "customer" && sub.files.length === 0) sub.status = "pending";
      step.done = (step.subtasks || []).every((s: any) => s.status === "done");
    }

    await flow.save();

    const key = removeKey || extractS3KeyFromUrl(fileUrl);
    if (key) await deleteManyFromS3([key]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ Delete error:", e);
    return NextResponse.json(
      { ok: false, error: "internal_error", debug: e?.message || String(e) },
      { status: 500 }
    );
  }
}
