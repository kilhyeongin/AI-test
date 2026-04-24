// src/app/api/health/db/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const readyState = mongoose.connection.readyState;
    const dbName = mongoose.connection.name;

    return NextResponse.json({
      ok: true,
      mongo: {
        readyState, // 1이면 connected
        db: dbName,
      },
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "db_error",
        ts: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}