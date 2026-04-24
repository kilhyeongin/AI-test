// src/models/LandItinerary.ts
import mongoose, { Schema, models } from "mongoose";

/** =========================
 *  (기존 구조 유지: 예전 데이터 호환용)
 *  ========================= */
const ScheduleItemSchema = new Schema(
  {
    time: String,
    description: String,
  },
  { _id: false }
);

const DayPlanSchema = new Schema(
  {
    dayNumber: Number,
    date: String,
    schedules: [ScheduleItemSchema],

    hotelName: String,
    hotelAddress: String,
    hotelWebsite: String,

    breakfast: String,
    lunch: String,
    dinner: String,

    rating: { type: Number, default: 0 },
  },
  { _id: false }
);

/** =========================
 *  ✅ V2: 지금 랜드 템플릿 작성 UI 구조
 *  (region/transport/rows/hotelKr...)
 *  ========================= */
const LandScheduleRowSchema = new Schema(
  {
    id: { type: String, required: true },
    time: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  { _id: false }
);

const LandDayPlanV2Schema = new Schema(
  {
    day: { type: Number, required: true },
    region: { type: String, default: "" },
    transport: { type: String, default: "" },
    rows: { type: [LandScheduleRowSchema], default: [] },

    breakfast: { type: String, default: "선택" },
    lunch: { type: String, default: "선택" },
    dinner: { type: String, default: "선택" },

    hotelKr: { type: String, default: "" },
    hotelEn: { type: String, default: "" },
    hotelGrade: { type: String, default: "" },
    hotelAddress: { type: String, default: "" },
  },
  { _id: false }
);

/** =========================
 *  ✅ HTML 섹션 저장용 (공통/선택 섹션)
 *  ========================= */
const HtmlSectionSchema = new Schema(
  {
    key: { type: String, required: true }, // includes/excludes/visa/remark + opt_xxx
    title: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    html: { type: String, default: "" },
  },
  { _id: false }
);

const LandItinerarySchema = new Schema(
  {
    landId: { type: Schema.Types.ObjectId, ref: "LandAgency" },

    tripTitle: { type: String, required: true },
    destination: String,
    duration: String,
    summary: String,

    // ✅ 섹션 HTML (공통/선택 섹션을 여기로 저장)
    sectionsHtml: { type: [HtmlSectionSchema], default: [] },

    // ✅ (옵션) 표 기반 자유 작성 HTML을 쓰는 경우 유지
    scheduleHtml: { type: String, default: "" },

    // ✅ V2: 지금 작성 UI의 일차별 데이터
    dayPlansV2: { type: [LandDayPlanV2Schema], default: [] },

    // (기존 방식 데이터 호환용)
    dayPlans: { type: [DayPlanSchema], default: [] },

    // (기존 텍스트 필드 호환용)
    includes: String,
    excludes: String,
    notes: String,
  },
  { timestamps: true }
);

LandItinerarySchema.index({ landId: 1 });

const LandItinerary =
  models.LandItinerary || mongoose.model("LandItinerary", LandItinerarySchema);

export default LandItinerary;
