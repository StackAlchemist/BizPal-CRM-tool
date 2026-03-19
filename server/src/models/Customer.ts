import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomer extends Document {
  userId: Types.ObjectId;
  name: string;
  phone: string;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate phone per user
CustomerSchema.index({ userId: 1, phone: 1 }, { unique: true });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
