import mongoose, { Document, Schema, Types } from 'mongoose';
import { OrderStatus } from '../types';

export interface IOrder extends Document {
  userId: Types.ObjectId;
  customerId: Types.ObjectId;
  productName: string;
  amount: number;
  status: OrderStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Delivered'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
