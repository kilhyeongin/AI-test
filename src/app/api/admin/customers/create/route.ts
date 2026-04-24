import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/jwt";
import { hashPassword } from "@/lib/crypto";
import { Customer } from "@/models/Customer";

export async function POST(req: NextRequest) {
  await connectDB();
  const c = await cookies();
  const admin = verifyAdminSession(c.get("admin_session")?.value || "");
  if (!admin) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

  try {
    const { email, name, password } = await req.json();
    if (!email || !name || !password) {
      return NextResponse.json({ ok:false, error:"missing_fields" }, { status:400 });
    }
    const emailLower = String(email).trim().toLowerCase();
    const dup = await Customer.findOne({ emailLower }).select("_id").lean();
    if (dup) return NextResponse.json({ ok:false, error:"email_exists" }, { status:409 });

    const doc = await Customer.create({
      email, emailLower, name,
      status: "active",
      passwordHash: await hashPassword(password),
    });

    return NextResponse.json({ ok:true, id:String(doc._id) });
  } catch (e:any) {
    console.error("[admin/customers/create]", e);
    return NextResponse.json({ ok:false, error:"internal_error", debug:e?.message||String(e) }, { status:500 });
  }
}
