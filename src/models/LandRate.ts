// src/models/LandRate.ts
import mongoose, { Schema, models } from "mongoose";

const RatePlanSchema = new Schema(
  {
    meal: String,           // 식사 타입 (HB, AI 등)
    nightsLabel: String,    // "4박", "3박4일" 등 텍스트
    price: String,          // n박 요금
    extraNightPrice: String // 1박 추가 요금
  },
  { _id: false }
);

const RateRowSchema = new Schema(
  {
    stayPeriod: String, // 투숙기간 (예: 24/01/19~24/04/30)
    roomType: String,   // 객실명
    occupancy: String,  // 투숙인원 (2A+1C, 2인1실 등)

    plan1: RatePlanSchema, // 보통 HB
    plan2: RatePlanSchema, // 보통 AI
  },
  { _id: false }
);

const LandRateSchema = new Schema(
  {
    // 나중에 LandAgency와 연결할 landId (현재는 옵션)
    landId: { type: Schema.Types.ObjectId, ref: "LandAgency" },

    resortName: { type: String, required: true },

    rateRows: [RateRowSchema],

    // 텍스트 블록들
    saleNotes: String,         // 판매 시 유의 사항
    inclusions: String,        // 포함사항
    exclusions: String,        // 불포함사항
    resortBenefits: String,    // 리조트 제공 사항
    honeymoonBenefits: String, // 허니문 특전
    hbBenefits: String,        // HB 제공 사항
    aiBenefits: String,        // AI 제공 사항
    paymentAndCancel: String,  // 입금 및 취소 규정
    extraCancel: String,       // 추가 취소
  },
  { timestamps: true }
);

LandRateSchema.index({ landId: 1 });

const LandRate =
  models.LandRate || mongoose.model("LandRate", LandRateSchema);

export default LandRate;
