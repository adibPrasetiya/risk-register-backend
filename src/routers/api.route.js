import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import riskController from '../controllers/risk.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/admin.middleware.js';

export const apiRoute = Router();

apiRoute.use(authMiddleware);

// Proses bisnis logout
apiRoute.delete('/users/logout', userController.logout);

// Proses bisnis update password (user sudah terautentikasi)
apiRoute.patch('/users/password', userController.updatePassword);

// User Profile
apiRoute.patch('/users/current', userController.updateProfile);

// 2FA
apiRoute.post('/users/2fa/generate', userController.generate2FA);
apiRoute.post('/users/2fa/enable', userController.enable2FA);
apiRoute.post('/users/2fa/disable', userController.disable2FA);

// --- Risk Register & Risiko (tetap) ---
apiRoute.get('/risk-registers', riskController.listRegisters);
apiRoute.post('/risk-registers', riskController.createRegister);
apiRoute.get('/risk-registers/:registerId', riskController.getRegister);

apiRoute.post('/risk-registers/:registerId/risks', riskController.createRisk);
apiRoute.patch('/risks/:riskId', riskController.updateRisk);

apiRoute.post('/risks/:riskId/treatments', riskController.addTreatment);
apiRoute.post('/risks/:riskId/monitoring', riskController.addMonitoringLog);

// Struktur / Governance
apiRoute.get('/risk-governance', riskController.listGovernance);
apiRoute.post('/risk-governance', adminMiddleware, riskController.assignGovernance);

// --- Admin: reset password workflow & user verification ---
apiRoute.get('/admin/password-reset/requests', adminMiddleware, userController.listResetPasswordRequests);
apiRoute.post('/admin/password-reset/complete', adminMiddleware, userController.completeResetPassword);

apiRoute.patch('/admin/users/:userId/verify', adminMiddleware, userController.verifyUser);
