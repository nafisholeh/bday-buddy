import { Router } from 'express';
import userRoutes from './userRoutes';
import { BirthdayService } from '../services/birthdayService';

const router = Router();

export const initializeRoutes = (birthdayService: BirthdayService) => {
  router.use(userRoutes);

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      schedulerRunning: birthdayService.isSchedulerRunning(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

export default router;
