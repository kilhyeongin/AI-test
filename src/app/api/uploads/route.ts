// /src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 환경 변수
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;

if (!S3_BUCKET || !AWS_REGION) {
  console.warn("[/api/uploads] S3_BUCKET or AWS_REGION is not set");
}

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

// 허용 MIME 타입 화이트리스트
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function makeRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const {
    filename,
    fileSize,
    contentType,
    customerId,
    flowId,
    order,
    actor,
    subKey,
    folder, // ✅ land-agency 같은 용도용 폴더
  } = body || {};

  // 공통 기본 검증
  if (!filename || !fileSize || !contentType) {
    console.warn("[/api/uploads] missing basic fields:", { filename, fileSize, contentType });
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  // 파일 타입 검증
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return NextResponse.json({ ok: false, error: "unsupported_file_type" }, { status: 400 });
  }

  // 파일 크기 검증 (50MB)
  if (Number(fileSize) > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const randomId = makeRandomId();

  // === 업로드 경로 결정 ===
  let key: string;

  if (folder) {
    // ✅ 1) 랜드사 회원가입 등 "folder" 기반 업로드
    //    예: land-agency/2025/11/xxxxx-파일명.png
    key = `${folder}/${yyyy}/${mm}/${randomId}-${encodeURIComponent(
      filename
    )}`;
  } else if (customerId && order && actor) {
    // ✅ 2) 기존 체크리스트 / 온보딩용 업로드
    //    예: uploads/dev/{customerId}/o3/customer/2025/11/xxxx-파일명.png
    const stage =
      process.env.APP_ENV || process.env.NODE_ENV || "dev";

    key = `uploads/${stage}/${customerId}/o${order}/${actor}/${yyyy}/${mm}/${randomId}-${encodeURIComponent(
      filename
    )}`;

    // subKey는 경로에는 굳이 안 써도 됨(원하면 여기에 붙여도 됨)
  } else {
    // ✅ 3) 기타 케이스 대비: 그냥 misc 폴더에 넣기
    key = `misc/${yyyy}/${mm}/${randomId}-${encodeURIComponent(filename)}`;
  }

  if (!S3_BUCKET || !AWS_REGION) {
    return NextResponse.json(
      { ok: false, error: "s3_not_configured" },
      { status: 500 }
    );
  }

  try {
    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      ContentLength: Number(fileSize) || undefined,
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });

    console.log("[/api/uploads] presign ok:", {
      bucket: S3_BUCKET,
      key,
    });

    return NextResponse.json(
      {
        ok: true,
        uploadUrl,
        object: { bucket: S3_BUCKET, key },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[/api/uploads] presign error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "presign_failed",
        debug: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
