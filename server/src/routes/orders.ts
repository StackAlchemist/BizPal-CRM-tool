import { Router } from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getStats,
} from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/stats', getStats);
router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrder).delete(deleteOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;
