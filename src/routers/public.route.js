import { Router } from 'express';
import userController from '../controllers/user.controller.js';

export const publicRoute = Router();

const routes = [
  {
    method: 'post',
    path: '/users',
    handler: userController.create,
  },
  {
    method: 'post',
    path: '/users/login',
    handler: userController.login,
  },
];

routes.forEach(({ method, path, handler }) => {
  publicRoute[method](path, handler);
});
