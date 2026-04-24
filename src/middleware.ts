// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/* =========================
 * Public paths
 * ========================= */
const PUBLIC_CUSTOMER = [
  "/customer/login",
  "/customer/register",
  "/customer/find-id",
  "/customer/find-password",
  "/customer/reset-password",
  "/customer/not-found",
];

const PUBLIC_ADMIN = ["/admin/login", "/admin/not-found"];

const PUBLIC_LAND = ["/land/login", "/land/register", "/land/not-found"];

/* =========================
 * Cookie helpers
 * ========================= */
function getCustomerToken(req: NextRequest) {
  return (
    req.cookies.get("customer_session")?.value ||
    req.cookies.get("client_session")?.value ||
    ""
  );
}
function getAdminToken(req: NextRequest) {
  return req.cookies.get("admin_session")?.value || "";
}
function getLandToken(req: NextRequest) {
  return req.cookies.get("land_session")?.value || "";
}

/* =========================
 * Edge-safe JWT verify (jose)
 * ========================= */
function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 운영에서 env 누락이면 로그인 전부 깨져야 정상(안전)
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

async function verifyTokenPersona(token: string, persona: "admin" | "customer" | "land") {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (!payload || payload.persona !== persona) return null;
    // sub는 문자열이어야 함 (필수)
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    // sessionVersion이 있으면 숫자로 해석 가능해야 함 (권장)
    const svRaw = (payload as any).sessionVersion;
    if (svRaw !== undefined) {
      const sv = typeof svRaw === "number" ? svRaw : Number(svRaw ?? NaN);
      if (!Number.isFinite(sv)) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/* =========================
 * Middleware
 * ========================= */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 정적/내부 리소스 제외
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  /* ===== Customer ===== */
  if (pathname.startsWith("/customer")) {
    if (startsWithAny(pathname, PUBLIC_CUSTOMER)) {
      // 로그인 페이지인데 이미 세션 있으면 대시보드로
      const token = getCustomerToken(req);
      if (token) {
        const ok = await verifyTokenPersona(token, "customer");
        if (ok && pathname === "/customer/login") {
          const url = req.nextUrl.clone();
          url.pathname = "/customer/dashboard";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
      return NextResponse.next();
    }

    const token = getCustomerToken(req);
    const ok = token ? await verifyTokenPersona(token, "customer") : null;
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/customer/login";
      url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  /* ===== Admin ===== */
  if (pathname.startsWith("/admin")) {
    if (startsWithAny(pathname, PUBLIC_ADMIN)) {
      const token = getAdminToken(req);
      if (token) {
        const ok = await verifyTokenPersona(token, "admin");
        if (ok && pathname === "/admin/login") {
          const url = req.nextUrl.clone();
          url.pathname = "/admin/dashboard";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
      return NextResponse.next();
    }

    const token = getAdminToken(req);
    const ok = token ? await verifyTokenPersona(token, "admin") : null;
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  /* ===== Land ===== */
  if (pathname.startsWith("/land")) {
    if (startsWithAny(pathname, PUBLIC_LAND)) {
      const token = getLandToken(req);
      if (token) {
        const ok = await verifyTokenPersona(token, "land");
        if (ok && pathname === "/land/login") {
          const url = req.nextUrl.clone();
          url.pathname = "/land/dashboard";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
      return NextResponse.next();
    }

    const token = getLandToken(req);
    const ok = token ? await verifyTokenPersona(token, "land") : null;
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/land/login";
      url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/customer/:path*", "/admin/:path*", "/land/:path*"],
};
