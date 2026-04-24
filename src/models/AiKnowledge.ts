import mongoose, { Schema, Document, models } from "mongoose";

export interface AiKnowledgeDocument extends Document {
  fileName: string;
  fileType: "excel" | "csv" | "text";
  sheetName?: string;
  headers: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  rawText?: string;
  uploadedBy: string;
  category?: string;
  validFrom?: string;
  validTo?: string;
  createdAt?: Date;
}

const AiKnowledgeSchema = new Schema(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ["excel", "csv", "text"], required: true },
    docType: { type: String, enum: ["rate", "itinerary"], default: "rate" },
    sheetName: { type: String, default: "" },
    headers: { type: [String], default: [] },
    rows: { type: [Schema.Types.Mixed], default: [] },
    rawText: { type: String, default: "" },
    uploadedBy: { type: String, required: true },
    category: { type: String, default: "" },
    validFrom: { type: String, default: "" },
    validTo: { type: String, default: "" },
  },
  { timestamps: true }
);

const AiKnowledge =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (models.AiKnowledge as mongoose.Model<any>) ||
  mongoose.model("AiKnowledge", AiKnowledgeSchema);

export default AiKnowledge;
