// src/models/ChecklistTemplate.ts
// ---------------------------------------------
// 체크리스트 템플릿 모델
//  - 관리자 페이지에서 만드는 템플릿 저장
//  - 고객별 체크리스트 생성 시 참조
// ---------------------------------------------

import { Schema, model, models, type Document } from "mongoose";

export type TemplateRole = "admin" | "customer";
export type TemplateKind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

export type TemplateArea = "main" | "extra";

export type TemplateItem = {
  key: string;
  title: string;
  defaultRole: TemplateRole;
  defaultKind: TemplateKind;
  area: TemplateArea; // "main" = 필수 서류 / "extra" = 추가 서류
};

export interface ChecklistTemplateDoc extends Document {
  name: string;
  description?: string;
  items: TemplateItem[];
  createdAt: Date;
  updatedAt: Date;
}

const TemplateItemSchema = new Schema<TemplateItem>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    defaultRole: { type: String, enum: ["admin", "customer"], required: true },
    defaultKind: {
      type: String,
      enum: ["ADMIN_UPLOAD_VIEW", "CLIENT_UPLOAD_REVIEW", "PAYMENT_PIPELINE"],
      required: true,
    },
    area: {
      type: String,
      enum: ["main", "extra"],
      required: true,
    },
  },
  { _id: false },
);

const ChecklistTemplateSchema = new Schema<ChecklistTemplateDoc>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    items: { type: [TemplateItemSchema], default: [] },
  },
  { timestamps: true }
);

const ChecklistTemplate =
  (models.ChecklistTemplate as ChecklistTemplateDoc & typeof models.ChecklistTemplate) ||
  model<ChecklistTemplateDoc>("ChecklistTemplate", ChecklistTemplateSchema);

export default ChecklistTemplate;
export { ChecklistTemplate };
