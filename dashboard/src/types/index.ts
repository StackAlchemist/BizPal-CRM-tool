export type OrderStatus = "Pending" | "Paid" | "Delivered";
export type Plan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  businessName: string;
  subscriptionPlan: Plan;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  customerId: { _id: string; name: string; phone: string } | string;
  productName: string;
  amount: number;
  status: OrderStatus;
  notes: string;
  createdAt: string;
}

export interface Stats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}
