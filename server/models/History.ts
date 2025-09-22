import mongoose, { Schema, InferSchemaType } from "mongoose";

const HistorySchema = new Schema(
  {
    type: { type: String, enum: ["generated", "submitted", "cleared"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    teamMember: { type: String, required: false },
    code: { type: String, required: true, index: true },
    country: { type: String, required: false },
    comments: { type: String, required: false },
    clearanceId: { type: String, required: false },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

HistorySchema.index({ type: 1, date: -1 });

export type HistoryDoc = InferSchemaType<typeof HistorySchema> & { _id: mongoose.Types.ObjectId };

export const HistoryModel = mongoose.models.History || mongoose.model("History", HistorySchema);
