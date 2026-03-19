import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const signToken = (userId: string): string =>
  jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, businessName } = req.body;

    if (!email || !password || !businessName) {
      res.status(400).json({ message: 'email, password, and businessName are required' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const user = await User.create({ email, password, businessName });
    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = signToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getMe = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
