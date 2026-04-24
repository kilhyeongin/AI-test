// src/models/Itinerary.ts
// 여행 일정표(Itinerary) 몽구스 모델

import mongoose, { Schema, Document, models } from "mongoose";

/** ✅ 랜드 템플릿 섹션 키 (고정 4종) */
export type CommonKey = "includes" | "excludes" | "visa" | "remark";

export type CommonSection = {
  key: CommonKey;
  title: string;
  html: string;
  fixed: true;
};

export type OptionalSection = {
  id: string;
  title: string;
  html: string;
};

export type ScheduleItem = {
  time: string;
  text: string;
};

export type DayPlan = {
  day: number;

  // ✅ 날짜는 없어도 됨
  date?: string;

  region: string;
  transport: string;

  schedules: ScheduleItem[];

  breakfast: string;
  lunch: string;
  dinner: string;

  hotelKr: string;
  hotelEn: string;
  hotelGrade: string;
  hotelAddress: string;
  hotelHomepage: string;
};

export interface ItineraryDocument extends Document {
  title: string;
  description?: string;
  country?: string;
  city?: string;

  includeText?: string;
  excludeText?: string;
  travelerText?: string;
  shoppingText?: string;

  managerName?: string;
  mode: "PNR" | "MANUAL";

  segments?: {
    departureAirport: string;
    arrivalAirport: string;
    departureDateTime: string;
    arrivalDateTime: string;
    carrier?: string;
    flightNumber?: string;
  }[];

  commonSections?: CommonSection[];
  optionalSections?: OptionalSection[];

  days: DayPlan[];
  dayBlocks?: any[];

  createdAt?: Date;
  updatedAt?: Date;
}

/** ===================== Schemas ===================== */

const CommonSectionSchema = new Schema<CommonSection>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, default: "" },
    fixed: { type: Boolean, default: true },
  },
  { _id: false }
);

const OptionalSectionSchema = new Schema<OptionalSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, default: "" },
  },
  { _id: false }
);

const ScheduleSchema = new Schema<ScheduleItem>(
  {
    time: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  { _id: false }
);

const DayPlanSchema = new Schema<DayPlan>(
  {
    day: { type: Number, required: true },

    // ✅ 핵심: required 제거
    date: { type: String, default: "" },

    region: { type: String, default: "" },
    transport: { type: String, default: "" },

    schedules: {
      type: [ScheduleSchema],
      default: [],
    },

    breakfast: { type: String, default: "선택" },
    lunch: { type: String, default: "선택" },
    dinner: { type: String, default: "선택" },

    hotelKr: { type: String, default: "" },
    hotelEn: { type: String, default: "" },
    hotelGrade: { type: String, default: "" },
    hotelAddress: { type: String, default: "" },
    hotelHomepage: { type: String, default: "" },
  },
  { _id: false }
);

const ItinerarySchema = new Schema<ItineraryDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },

    includeText: { type: String, default: "" },
    excludeText: { type: String, default: "" },
    travelerText: { type: String, default: "" },
    shoppingText: { type: String, default: "" },

    managerName: { type: String, default: "" },

    commonSections: { type: [CommonSectionSchema], default: [] },
    optionalSections: { type: [OptionalSectionSchema], default: [] },

    mode: {
      type: String,
      enum: ["PNR", "MANUAL"],
      required: true,
      default: "PNR",
    },

    segments: [
      {
        departureAirport: String,
        arrivalAirport: String,
        departureDateTime: String,
        arrivalDateTime: String,
        carrier: String,
        flightNumber: String,
      },
    ],

    days: {
      type: [DayPlanSchema],
      default: [],
    },

    dayBlocks: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ✅ 개발환경에서만: 기존 모델 캐시 제거
 * - Next dev + HMR에서 예전 required 스키마가 계속 남는 문제 방지
 */
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (models as any).Itinerary;
}

const Itinerary =
  (models.Itinerary as mongoose.Model<ItineraryDocument>) ||
  mongoose.model<ItineraryDocument>("Itinerary", ItinerarySchema);

export default Itinerary;
