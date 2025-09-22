import mongoose, { Schema, InferSchemaType } from "mongoose";

export type TicketPool = "HSV" | "OSV" | "Common";
export type TicketStatus = "available" | "used";

const TicketSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    pool: { type: String, enum: ["HSV", "OSV", "Common"], required: true },
    status: { type: String, enum: ["available", "used"], default: "available" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

TicketSchema.index({ pool: 1, status: 1 });

export type TicketDoc = InferSchemaType<typeof TicketSchema> & { _id: mongoose.Types.ObjectId };

export const TicketModel = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
