// src/models/LandItineraryTemplate.ts
import mongoose, { Schema, models, model } from "mongoose";

type CommonKey = "includes" | "excludes" | "visa" | "remark";

const CommonSectionSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, default: "" },
    fixed: { type: Boolean, default: true },
  },
  { _id: false }
);

const OptionalSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    html: { type: String, default: "" },
  },
  { _id: false }
);

const LandScheduleRowSchema = new Schema(
  {
    id: { type: String, required: true },
    time: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  { _id: false }
);

const LandDayPlanSchema = new Schema(
  {
    day: { type: Number, required: true },
    region: { type: String, default: "" },
    transport: { type: String, default: "" },
    rows: { type: [LandScheduleRowSchema], default: [] },
    breakfast: { type: String, default: "선택" },
    lunch: { type: String, default: "선택" },
    dinner: { type: String, default: "선택" },
  },
  { _id: false }
);

const LandItineraryTemplateSchema = new Schema(
  {
    // 기본 정보
    tripTitle: { type: String, default: "" },
    destination: { type: String, default: "" },
    duration: { type: String, default: "" },
    summary: { type: String, default: "" },

    // 섹션 HTML
    commonSections: { type: [CommonSectionSchema], default: [] },
    optionalSections: { type: [OptionalSectionSchema], default: [] },

    // 일정표 데이터(표 UI)
    dayPlans: { type: [LandDayPlanSchema], default: [] },

    // (혹시 기존 호환 필드가 있으면 유지)
    includes: { type: String, default: "" },
    excludes: { type: String, default: "" },
    notes: { type: String, default: "" },
    scheduleHtml: { type: String, default: "" },
  },
  { timestamps: true }
);

export type LandItineraryTemplateDoc = mongoose.InferSchemaType<
  typeof LandItineraryTemplateSchema
>;

export const LandItineraryTemplate =
  models.LandItineraryTemplate ||
  model("LandItineraryTemplate", LandItineraryTemplateSchema);
