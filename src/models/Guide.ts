// /src/models/Guide.ts
import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IGuideSegment {
  airline: string;
  flightNo: string;
  depart: string;
  arrive: string;
  date?: string;
  depTime?: string;
  arrTime?: string;
  duration?: string;
}

export interface IGuide extends Document {
  travelerName: string;

  // 항공편
  segments: IGuideSegment[];

  // 체크인
  checkinAirline?: string;
  checkinTerminal?: string;

  // 공항 미팅
  meetingPlace?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingStaffName?: string;
  meetingStaffPhone?: string;

  // 현지 미팅
  localBoardName?: string;
  localStaffName?: string;
  localPhone?: string;
  localEmergencyPhone?: string;
  localImageUrl?: string; // 나중에 S3 연동하면 사용

  // 여행지
  country?: string;
  city?: string;
  weatherInfo?: string;
  outfitInfo?: string;
  exchangeInfo?: string;
  immigrationInfo?: string;
  visaInfo?: string;
  localTimeInfo?: string;
  plugInfo?: string;

  // 회사 정보
  companyName?: string;
  companyDesc?: string;

  // 로고/생성시간
  logoUrl?: string; // 로고 파일 업로드 붙이면 여기에 URL 넣기
  createdAt: Date;
  updatedAt: Date;
}

const GuideSegmentSchema = new Schema<IGuideSegment>(
  {
    airline: { type: String, default: "" },
    flightNo: { type: String, default: "" },
    depart: { type: String, default: "" },
    arrive: { type: String, default: "" },
    date: { type: String, default: "" },
    depTime: { type: String, default: "" },
    arrTime: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const GuideSchema = new Schema<IGuide>(
  {
    // 필수지만 기본값은 빈 문자열로
    travelerName: { type: String, required: true, default: "" },

    segments: {
      type: [GuideSegmentSchema],
      default: [],
    },

    checkinAirline: { type: String, default: "" },
    checkinTerminal: { type: String, default: "" },

    meetingPlace: { type: String, default: "" },
    meetingDate: { type: String, default: "" },
    meetingTime: { type: String, default: "" },
    meetingStaffName: { type: String, default: "" },
    meetingStaffPhone: { type: String, default: "" },

    localBoardName: { type: String, default: "" },
    localStaffName: { type: String, default: "" },
    localPhone: { type: String, default: "" },
    localEmergencyPhone: { type: String, default: "" },
    localImageUrl: { type: String, default: "" },

    country: { type: String, default: "" },
    city: { type: String, default: "" },
    weatherInfo: { type: String, default: "" },
    outfitInfo: { type: String, default: "" },
    exchangeInfo: { type: String, default: "" },
    immigrationInfo: { type: String, default: "" },
    visaInfo: { type: String, default: "" },
    localTimeInfo: { type: String, default: "" },
    plugInfo: { type: String, default: "" },

    companyName: { type: String, default: "" },
    companyDesc: { type: String, default: "" },

    logoUrl: { type: String, default: "" },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// ⚠️ 여기서 default export가 아니라 named export이므로
// 사용 시에는 반드시 `import { Guide } from "@/models/Guide"` 형태로 가져오기
export const Guide =
  (models.Guide as mongoose.Model<IGuide>) || model<IGuide>("Guide", GuideSchema);
