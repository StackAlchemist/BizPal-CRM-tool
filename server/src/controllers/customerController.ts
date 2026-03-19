import { Response } from 'express';
import Customer from '../models/Customer';
import { AuthRequest } from '../types';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, tag } = req.query;
    const query: Record<string, unknown> = { userId: req.userId };

    if (search) query.name = { $regex: search, $options: 'i' };
    if (tag) query.tags = tag;

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.userId });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, tags, notes } = req.body;

    if (!name || !phone) {
      res.status(400).json({ message: 'name and phone are required' });
      return;
    }

    const customer = await Customer.create({
      userId: req.userId,
      name,
      phone,
      tags: tags || [],
      notes: notes || '',
    });

    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'A customer with this phone number already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
