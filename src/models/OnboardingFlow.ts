// src/models/OnboardingFlow.ts
// ---------------------------------------------
// 고객-관리자 상호작용 체크리스트(여행 온보딩 플로우)
//  - 고객별 여행 체크리스트 전체 상태 저장
//  - 일정표(Itinerary) 연결 필드 포함
// ---------------------------------------------

import { Schema, model, models, Types } from "mongoose";

export type StepKind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

export type StepRole = "admin" | "customer";

export type FileRef = {
  name?: string;
  url?: string;

  // ✅ 추가: presigned 발급용 S3 object key
  s3Key?: string | null;

  size?: number;
  uploadedAt?: Date;
  uploadedBy?: StepRole;
  uploadedByName?: string;
};

export type SubTask = {
  key: string;
  title: string;
  role: StepRole;
  status: "pending" | "done";
  files: FileRef[];
};

export type Step = {
  order: number;
  title: string;
  icon?: string;
  kind: StepKind;
  stepKey: string;
  badge?: string;
  done: boolean;
  filesAdmin: FileRef[];
  filesCustomer: FileRef[];
  subtasks: SubTask[];

  readAdminAt?: Date | null;
  readAdminName?: string;
  readCustomerAt?: Date | null;
  readCustomerName?: string;
};

export type OnboardingFlowDoc = {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;

  customerName?: string;
  customerEmail?: string;

  destination: string;
  nights: number;
  days: number;
  departDate: Date;

  steps: Step[];

  templateId?: string;

  itineraryId?: Types.ObjectId | null;
  itineraryConnectedAt?: Date | null;

  createdByAdminId?: Types.ObjectId | null;
  createdByAdminName?: string;

  createdAt: Date;
  updatedAt: Date;
};

const FileRefSchema = new Schema<FileRef>(
  {
    name: String,
    url: String,

    // ✅ 추가
    s3Key: { type: String, default: null },

    size: Number,
    uploadedAt: Date,
    uploadedBy: { type: String, enum: ["admin", "customer"] },
    uploadedByName: { type: String, default: "" },
  },
  { _id: false }
);

const SubTaskSchema = new Schema<SubTask>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], required: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    files: { type: [FileRefSchema], default: [] },
  },
  { _id: false }
);

const StepSchema = new Schema<Step>(
  {
    order: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    icon: { type: String, default: "" },
    kind: {
      type: String,
      enum: ["ADMIN_UPLOAD_VIEW", "CLIENT_UPLOAD_REVIEW", "PAYMENT_PIPELINE"],
      required: true,
    },
    stepKey: { type: String, default: "" },
    badge: { type: String, default: "" },
    done: { type: Boolean, default: false },

    filesAdmin: { type: [FileRefSchema], default: [] },
    filesCustomer: { type: [FileRefSchema], default: [] },
    subtasks: { type: [SubTaskSchema], default: [] },

    readAdminAt: { type: Date, default: null },
    readAdminName: { type: String, default: "" },
    readCustomerAt: { type: Date, default: null },
    readCustomerName: { type: String, default: "" },
  },
  { _id: false }
);

const OnboardingFlowSchema = new Schema(
  {
    customerId: { type: Types.ObjectId, required: true, index: true },

    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },

    destination: { type: String, default: "" },
    nights: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    departDate: { type: Date, required: true },

    steps: { type: [StepSchema], default: [] },

    templateId: { type: String, default: "" },

    itineraryId: {
      type: Types.ObjectId,
      ref: "Itinerary",
      default: null,
    },
    itineraryConnectedAt: { type: Date, default: null },

    createdByAdminId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByAdminName: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// 고객별 정렬 조회 성능 향상
OnboardingFlowSchema.index({ customerId: 1, createdAt: -1 });

const OnboardingFlow =
  (models.OnboardingFlow as any) || model("OnboardingFlow", OnboardingFlowSchema);

export default OnboardingFlow;
export { OnboardingFlow };
