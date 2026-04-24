// src/lib/s3.ts
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * 필요한 환경변수 (.env.local)
 * AWS_ACCESS_KEY_ID=...
 * AWS_SECRET_ACCESS_KEY=...
 * AWS_REGION=ap-northeast-2
 * S3_BUCKET_NAME=your-bucket
 * S3_PUBLIC_BASE=https://your-bucket.s3.ap-northeast-2.amazonaws.com
 *   ↳ 업로드 시 사용했던 publicUrl의 프리픽스와 정확히 일치해야 함
 */
const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET_NAME!;
const PUBLIC_BASE = (process.env.S3_PUBLIC_BASE || "").replace(/\/+$/, "");

export const s3 = new S3Client({ region: REGION });

/** 퍼블릭 URL → S3 object key 추출 (우리 버킷/도메인만 허용) */
export function parseKeyFromUrl(fileUrl: string): string | null {
  try {
    const u = new URL(fileUrl);
    const host = u.host;
    const path = u.pathname.replace(/^\/+/, "");

    // 1) https://{bucket}.s3.{region}.amazonaws.com/{key}
    const isAws1 = host.startsWith(`${BUCKET}.s3.`) && host.endsWith("amazonaws.com");
    if (isAws1) return decodeURIComponent(path);

    // 2) https://s3.{region}.amazonaws.com/{bucket}/{key}
    const isAws2 = host === `s3.${REGION}.amazonaws.com` && path.startsWith(`${BUCKET}/`);
    if (isAws2) return decodeURIComponent(path.slice(BUCKET.length + 1));

    // 3) 커스텀 CDN/도메인
    if (PUBLIC_BASE && fileUrl.startsWith(PUBLIC_BASE + "/")) {
      return decodeURIComponent(fileUrl.slice(PUBLIC_BASE.length + 1));
    }

    return null;
  } catch {
    return null;
  }
}

export async function deleteObjectByUrl(fileUrl: string): Promise<{ ok: boolean; reason?: string }> {
  if (!BUCKET) return { ok: false, reason: "missing_bucket" };
  const key = parseKeyFromUrl(fileUrl);
  if (!key) return { ok: false, reason: "url_not_owned" };

  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  return { ok: true };
}
