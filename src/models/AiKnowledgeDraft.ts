import mongoose, { Schema, models } from "mongoose";

const AiKnowledgeDraftSchema = new Schema(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, default: "excel" },
    docType: { type: String, enum: ["rate", "itinerary"], default: "rate" },
    sheetName: { type: String, default: "" },
    summary: { type: String, default: "" },
    rows: { type: [Schema.Types.Mixed], default: [] },
    uploadedBy: { type: String, required: true },
    category: { type: String, default: "" },
    validFrom: { type: String, default: "" },
    validTo: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// 요금표 표준 컬럼
export const STANDARD_HEADERS = ["상품명", "룸타입", "기간", "1인요금", "통화", "포함사항", "특이사항"];
// 일정표 표준 컬럼
export const ITINERARY_HEADERS = ["일차", "지역", "교통편", "일정내용", "선택관광", "숙박", "식사", "특이사항"];

const AiKnowledgeDraft =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (models.AiKnowledgeDraft as mongoose.Model<any>) ||
  mongoose.model("AiKnowledgeDraft", AiKnowledgeDraftSchema);

export default AiKnowledgeDraft;
