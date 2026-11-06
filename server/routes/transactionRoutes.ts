import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransactionStatus,
  getTransactionSummary,
} from '../controllers/transactionController.js';

const router = Router();

router.get('/', getTransactions);
router.get('/summary/stats', getTransactionSummary);
router.get('/:identifier', getTransactionById);
router.post('/', createTransaction);
router.patch('/:id/status', updateTransactionStatus);

export default router;

