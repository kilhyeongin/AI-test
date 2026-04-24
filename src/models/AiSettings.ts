import mongoose, { Schema } from "mongoose";

const AiSettingsSchema = new Schema(
  {
    marginType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    marginAmount: { type: Number, default: 0 },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

const AiSettings =
  mongoose.models.AiSettings ?? mongoose.model("AiSettings", AiSettingsSchema);

export default AiSettings;
