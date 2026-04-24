// /src/app/api/files/open/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { verifyAdminSession } from "@/lib/jwt";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET!;
const ENV = process.env.NODE_ENV === "production" ? "prod" : "dev";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "";
  const customerId = searchParams.get("customerId") || ""; // 권한 확인용

  if (!key) return NextResponse.json({ ok:false, error:"missing_key" }, { status:400 });

  // 세션 검사
  const adminCookie = req.cookies.get("admin_session")?.value || "";
  const customerCookie = req.cookies.get("customer_session")?.value || req.cookies.get("client_session")?.value || "";

  const adminSess = verifyAdminSession(adminCookie);
  const customerSess = verifyCustomerSession(customerCookie);

  const isAdmin = !!adminSess;
  const isCustomer = !!customerSess && customerSess.persona === "customer";

  // 접근 제어: 고객은 자신의 프리픽스만
  if (!isAdmin) {
    if (!isCustomer) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
    if (!customerId || String(customerSess!.sub) !== customerId) {
      return NextResponse.json({ ok:false, error:"forbidden_customer" }, { status:403 });
    }
    const mustPrefix = `uploads/${ENV}/${customerId}/`;
    if (!key.startsWith(mustPrefix)) {
      return NextResponse.json({ ok:false, error:"forbidden_prefix" }, { status:403 });
    }
  }

  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 3 }); // 3분

  // <img src="/api/files/open?key=..."> 로 바로 쓰도록 302 리다이렉트
  return NextResponse.redirect(url, { status: 302 });
}
