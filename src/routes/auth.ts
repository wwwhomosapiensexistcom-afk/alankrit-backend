import { Router } from 'express';
import { login, register, me, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
