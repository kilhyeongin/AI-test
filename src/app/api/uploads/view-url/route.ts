// /src/app/api/uploads/view-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminSession } from "@/lib/session";
import { getCustomerId } from "@/lib/customerSession";
import { getLandSession } from "@/lib/landSession";

const S3_BUCKET = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;

function assertEnv() {
  if (!S3_BUCKET) throw new Error("Missing env: AWS_S3_BUCKET (or S3_BUCKET)");
  if (!AWS_REGION) throw new Error("Missing env: AWS_REGION (or AWS_S3_REGION)");
}

const s3 = new S3Client({
  region: AWS_REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

type ViewUrlBody = {
  key?: string;
  url?: string;
};

function extractKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, "");
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    assertEnv();

    // 세션 확인 (관리자, 고객, 랜드 중 하나)
    const [admin, customerId, land] = await Promise.all([
      getAdminSession(),
      getCustomerId(),
      getLandSession(),
    ]);

    if (!admin && !customerId && !land) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: ViewUrlBody;
    try {
      body = (await req.json()) as ViewUrlBody;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const rawKey = (body.key || "").trim();
    const rawUrl = (body.url || "").trim();

    const key = rawKey || (rawUrl ? extractKeyFromUrl(rawUrl) : "");
    if (!key) {
      return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
    }

    // 고객은 자신의 파일만 접근 가능
    if (customerId && !admin && !land) {
      const ENV = process.env.APP_ENV || process.env.NODE_ENV || "dev";
      const mustPrefix = `uploads/${ENV}/${customerId}/`;
      if (!key.startsWith(mustPrefix)) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET!,
      Key: key,
    });

    // 30분
    const viewUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 30 });

    return NextResponse.json(
      { ok: true, viewUrl, key },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "presign_failed", debug: msg }, { status: 500 });
  }
}
