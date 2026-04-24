// src/models/AdminItinerary.ts
import mongoose, { Schema, models, model } from "mongoose";

const CommonSectionSchema = new Schema(
  {
    key: { type: String, required: true }, // includes/excludes/visa/remark
    title: { type: String, required: true },
    html: { type: String, default: "" },
    fixed: { type: Boolean, default: true },
  },
  { _id: false }
);

const OptionalSectionSchema = new Schema(
  {
    id: { type: String, required: true }, // 랜드 템플릿 optionalSections.id
    title: { type: String, required: true },
    html: { type: String, default: "" },
  },
  { _id: false }
);

const RowSchema = new Schema(
  {
    id: { type: String, required: true },
    time: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  { _id: false }
);

const DayPlanSchema = new Schema(
  {
    day: { type: Number, required: true },
    region: { type: String, default: "" },
    transport: { type: String, default: "" },
    rows: { type: [RowSchema], default: [] },

    breakfast: { type: String, default: "선택" },
    lunch: { type: String, default: "선택" },
    dinner: { type: String, default: "선택" },

    // 랜드 템플릿/일정표에서 호텔까지 쓰면 같이 저장
    hotelKr: { type: String, default: "" },
    hotelEn: { type: String, default: "" },
    hotelGrade: { type: String, default: "" },
    hotelAddress: { type: String, default: "" },
  },
  { _id: false }
);

const AdminItinerarySchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "LandAgency", index: true },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: "User" },

    // ✅ 랜드 템플릿 출처 추적
    sourceLandTemplateId: { type: Schema.Types.ObjectId, ref: "LandItineraryTemplate", index: true },

    tripTitle: { type: String, required: true },
    destination: { type: String, default: "" },
    duration: { type: String, default: "" },
    summary: { type: String, default: "" },

    // ✅ 템플릿 구조와 동일하게 저장
    commonSections: { type: [CommonSectionSchema], default: [] },
    optionalSections: { type: [OptionalSectionSchema], default: [] },
    dayPlans: { type: [DayPlanSchema], default: [] },

    status: { type: String, default: "draft" },
  },
  { timestamps: true }
);

export type AdminItineraryDoc = mongoose.InferSchemaType<typeof AdminItinerarySchema>;

const AdminItinerary =
  (models.AdminItinerary as mongoose.Model<AdminItineraryDoc>) ||
  model<AdminItineraryDoc>("AdminItinerary", AdminItinerarySchema);

export default AdminItinerary;
