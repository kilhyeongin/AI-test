// src/lib/db.ts
import mongoose from "mongoose";

/**
 * 실무형 MongoDB 연결
 * - lazy connect (필요 시 연결)
 * - 전역 캐시로 중복 연결 방지
 * - 최초 연결 성공 시 1회만 로그
 */

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

const MONGODB_URI = requireEnv("MONGODB_URI");

function maskUri(uri: string) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:<pass>@");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  logged?: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongoose ?? { conn: null, promise: null, logged: false };

global._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("[MongoDB] connecting...", maskUri(MONGODB_URI));

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000, 
      })
      .then((m) => {
        if (!cached.logged) {
          cached.logged = true;
          console.log(`[MongoDB] ✅ Connected: db=${m.connection.name}`);
        }
        return m;
      })
      .catch((err) => {
        console.error("[MongoDB] ❌ Connection error:", err?.message || err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}