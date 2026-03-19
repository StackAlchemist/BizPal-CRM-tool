import { Response } from 'express';
import { Types } from 'mongoose';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { AuthRequest } from '../types';
import mongoose from 'mongoose';

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, customerId } = req.query;
    const query: Record<string, unknown> = { userId: req.userId };

    if (status) query.status = status;
    if (customerId) query.customerId = customerId;

    const orders = await Order.find(query)
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.userId }).populate(
      'customerId',
      'name phone'
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, productName, amount, status, notes } = req.body;

    if (!customerId || !productName || amount == null) {
      res.status(400).json({ message: 'customerId, productName, and amount are required' });
      return;
    }

    // Verify the customer belongs to this user
    const customer = await Customer.findOne({ _id: customerId, userId: req.userId });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const order = await Order.create({
      userId: req.userId,
      customerId,
      productName,
      amount,
      status: status || 'Pending',
      notes: notes || '',
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!['Pending', 'Paid', 'Delivered'].includes(status)) {
      res.status(400).json({ message: 'status must be Pending, Paid, or Delivered' });
      return;
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status },
      { new: true }
    ).populate('customerId', 'name phone');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const userObjectId = new Types.ObjectId(userId);

    const [totalCustomers, totalOrders, revenueAgg] = await Promise.all([
      Customer.countDocuments({ userId }),
      Order.countDocuments({ userId }),
      Order.aggregate([
        { $match: { userId: userObjectId, status: { $in: ['Paid', 'Delivered'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      totalCustomers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
