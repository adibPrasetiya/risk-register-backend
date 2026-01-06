import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const apiRoute = Router();

apiRoute.use(authMiddleware);

apiRoute.delete('/users/logout', userController.logout);
