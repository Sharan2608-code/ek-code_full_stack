import mongoose, { Schema, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    teamName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    type: { type: String, enum: ["HSV", "OSV"], required: true, default: "HSV" },
    // assigned codes tracked via Ticket.assignedTo
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
