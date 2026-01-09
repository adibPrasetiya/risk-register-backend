import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/admin.middleware.js';

export const apiRoute = Router();

apiRoute.use(authMiddleware);

apiRoute.delete('/users/logout', userController.logout);

// User Profile
apiRoute.patch('/users/current', userController.updateProfile);
apiRoute.patch('/users/password', userController.changePassword);

// 2FA
apiRoute.post('/users/2fa/generate', userController.generate2FA);
apiRoute.post('/users/2fa/enable', userController.enable2FA);
apiRoute.post('/users/2fa/disable', userController.disable2FA);

// Admin Routes
apiRoute.post('/admin/users/reset-password', adminMiddleware, userController.adminResetPassword);
