// /src/app/api/uploads/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getAdminSession } from "@/lib/session";
import { getCustomerId } from "@/lib/customerSession";

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

function extractKey(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.hostname.match(/^([^.]+)\.s3[.-][^.]+\.amazonaws\.com$/);
    if (m) return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    const publicBase = process.env.S3_PUBLIC_BASE;
    if (publicBase && url.startsWith(publicBase)) {
      return decodeURIComponent(url.slice(publicBase.length).replace(/^\/+/, ""));
    }
    return decodeURIComponent(u.pathname.replace(/^\/+/, "")) || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // 세션 확인 (관리자 또는 고객)
  const [admin, customerId] = await Promise.all([
    getAdminSession(),
    getCustomerId(),
  ]);

  if (!admin && !customerId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!S3_BUCKET || !AWS_REGION) {
    return NextResponse.json({ ok: false, error: "s3_not_configured" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:"invalid_json" }, { status:400 }); }
  const fileUrl = String(body?.fileUrl || "");
  if (!fileUrl) return NextResponse.json({ ok:false, error:"missing_fileUrl" }, { status:400 });

  const key = extractKey(fileUrl);
  if (!key) return NextResponse.json({ ok:false, error:"invalid_url" }, { status:400 });

  // 고객은 자신의 파일만 삭제 가능
  if (customerId && !admin) {
    const ENV = process.env.APP_ENV || process.env.NODE_ENV || "dev";
    const mustPrefix = `uploads/${ENV}/${customerId}/`;
    if (!key.startsWith(mustPrefix)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:"s3_delete_failed", debug:e?.message || String(e) }, { status:500 });
  }
}
