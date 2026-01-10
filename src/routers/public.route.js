import { Router } from 'express';
import userController from '../controllers/user.controller.js';

export const publicRoute = Router();

const routes = [
  // Proses Bisnis Pendaftaran User
  { method: 'post', path: '/users', handler: userController.create },
  { method: 'post', path: '/users/register', handler: userController.create }, // alias

  // Proses Bisnis Login User
  { method: 'post', path: '/users/login', handler: userController.login },

  // Proses bisnis reset password (request user, menunggu verifikasi admin)
  { method: 'post', path: '/users/reset-password/request', handler: userController.requestResetPassword },
];

routes.forEach(({ method, path, handler }) => {
  publicRoute[method](path, handler);
});
