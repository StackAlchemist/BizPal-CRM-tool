import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  userId?: string;
}

export type OrderStatus = 'Pending' | 'Paid' | 'Delivered';
export type SubscriptionPlan = 'free' | 'pro';

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}
