import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();
const userController = new UserController();

router.post('/user', userController.create);
router.delete('/user/:id', userController.delete);
router.put('/user/:id', userController.update);

export default router;
