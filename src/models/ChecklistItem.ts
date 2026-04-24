// src/models/ChecklistItem.ts
import mongoose, { Schema, models, model } from "mongoose";

export type ChecklistItemDoc = {
  customerId: mongoose.Types.ObjectId;
  title: string;
  done: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const ChecklistItemSchema = new Schema<ChecklistItemDoc>(
  {
    // 고객 소유 체크를 위해 route에서 customerId로 필터링 함
    customerId: { type: Schema.Types.ObjectId, required: true },

    // toggle route에서 select("_id title done") 하므로 최소 title 필요
    title: { type: String, required: true, trim: true },

    // toggle route에서 done 토글
    done: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// 동일 고객의 항목 조회/삭제/토글을 빠르게
ChecklistItemSchema.index({ customerId: 1, createdAt: -1 });

export const ChecklistItem =
  (models.ChecklistItem as mongoose.Model<ChecklistItemDoc>) ||
  model<ChecklistItemDoc>("ChecklistItem", ChecklistItemSchema);
