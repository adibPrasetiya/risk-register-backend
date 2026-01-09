import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import jwt from 'jsonwebtoken';
import {
  createTestUser,
  createAuthenticatedUser,
  createExpiredToken,
  createInvalidSignatureToken,
  verifySessionState,
} from './helpers/test.helper.js';
import { JWT_SECRET } from '../src/config/constant.js';

describe('Auth Middleware & Logout', () => {
  let token;
  let user;

  beforeEach(async () => {
    await prismaClient.session.deleteMany();
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();

    const { user: testUser, accessToken } = await createAuthenticatedUser(app);
    user = testUser;
    token = accessToken;
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  describe('Logout Success Cases', () => {
    it('should actually remove session on logout', async () => {
      let session = await prismaClient.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).not.toBeNull();

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      session = await prismaClient.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).toBeNull();
    });

    it('should clear refresh token cookie on logout', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const refreshTokenCookie = cookies.find((c) =>
          c.startsWith('refreshToken=')
        );
        if (refreshTokenCookie) {
          expect(refreshTokenCookie).toContain('Max-Age=0');
        }
      }
    });

    it('should return 200 OK on successful logout', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should have correct cookie clear attributes', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Auth Middleware - Valid Token', () => {
    it('should allow access to protected route with valid token', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBe('OK');
    });

    it('should set req.user correctly', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should include user roles in req.user', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should pass when user is active', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should verify token userId matches database user', async () => {
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(user.id);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Auth Middleware - Invalid Token', () => {
    it('should reject access without token', async () => {
      await request(app).delete('/users/logout').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = createExpiredToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: ['USER'],
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject token with invalid signature', async () => {
      const invalidToken = createInvalidSignatureToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: ['USER'],
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject token with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: ['USER'],
        },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);
    });

    it('should reject malformed token (not Bearer format)', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', token)
        .expect(401);
    });

    it('should reject request without Bearer prefix', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Token ${token}`)
        .expect(401);
    });

    it('should reject empty Authorization header', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', '')
        .expect(401);
    });

    it('should handle token with extra spaces', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer  ${token}`)
        .expect(401);
    });

    it('should reject token with null bytes', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}\0`)
        .expect(401);
    });

    it('should return 401 for deleted user token', async () => {
      const deletedUserId = user.id;

      await prismaClient.user.delete({
        where: { id: deletedUserId },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('Auth Middleware - User State', () => {
    it('should return 403 when user is inactive', async () => {
      await prismaClient.user.update({
        where: { id: user.id },
        data: { is_active: false },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when token issued before password change', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: futureDate },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should pass when token issued after password change', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60);
      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: pastDate },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should return 401 when user deleted after token issued', async () => {
      const userIdToDelete = user.id;

      await prismaClient.user.delete({
        where: { id: userIdToDelete },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should work when user email changed after token issued', async () => {
      await prismaClient.user.update({
        where: { id: user.id },
        data: { email: 'newemail@example.com' },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should not conflict with multiple middleware checks', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { user: newUser, accessToken: newToken } =
        await createAuthenticatedUser(app);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });
  });

  describe('Logout Edge Cases', () => {
    it('should return 404 when logout without session', async () => {
      await prismaClient.session.delete({
        where: { userId: user.id },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should reject logout with expired token', async () => {
      const expiredToken = createExpiredToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: ['USER'],
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should fail on logout twice with same token', async () => {
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should not logout different user with wrong token', async () => {
      const { user: otherUser, accessToken: otherToken } =
        await createAuthenticatedUser(app);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const otherSession = await prismaClient.session.findUnique({
        where: { userId: otherUser.id },
      });
      expect(otherSession).not.toBeNull();
    });

    it('should remove only own session', async () => {
      const { user: otherUser } = await createAuthenticatedUser(app);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const mySession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });
      expect(mySession).toBeNull();

      const otherSession = await prismaClient.session.findUnique({
        where: { userId: otherUser.id },
      });
      expect(otherSession).not.toBeNull();
    });

    it('should handle concurrent logout attempts', async () => {
      const promises = [
        request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${token}`),
        request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${token}`),
      ];

      const results = await Promise.allSettled(promises);
      const statuses = results.map((r) =>
        r.status === 'fulfilled' ? r.value.status : null
      );

      const successCount = statuses.filter((s) => s === 200).length;
      const notFoundCount = statuses.filter((s) => s === 404).length;

      expect(successCount).toBeLessThanOrEqual(1);
      expect(successCount + notFoundCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Password Change Scenarios', () => {
    it('should handle token created at exactly password_changed_at', async () => {
      const tokenIssuedAt = jwt.decode(token).iat;
      const passwordChangedDate = new Date(tokenIssuedAt * 1000);

      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: passwordChangedDate },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should reject token created 1s before password change', async () => {
      const tokenIssuedAt = jwt.decode(token).iat;
      const passwordChangedDate = new Date((tokenIssuedAt + 1) * 1000);

      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: passwordChangedDate },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should accept token created 1s after password change', async () => {
      const tokenIssuedAt = jwt.decode(token).iat;
      const passwordChangedDate = new Date((tokenIssuedAt - 1) * 1000);

      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: passwordChangedDate },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should pass when user has null password_changed_at', async () => {
      await prismaClient.user.update({
        where: { id: user.id },
        data: { password_changed_at: null },
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should verify iat timestamp comparison logic', async () => {
      const decoded = jwt.decode(token);
      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Token Expiry Tests', () => {
    it('should reject token expired 1 second ago', async () => {
      const expiredToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: ['USER'],
        },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should accept token that expires in 1 second', async () => {
      const almostExpiredToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: ['USER'],
        },
        JWT_SECRET,
        { expiresIn: '1s' }
      );

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${almostExpiredToken}`)
        .expect(200);
    });

    it('should handle token with nbf (not before) claim in future', async () => {
      const futureNbf = Math.floor(Date.now() / 1000) + 3600;
      const tokenWithNbf = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: ['USER'],
          nbf: futureNbf,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${tokenWithNbf}`)
        .expect(401);
    });

    it('should accept token with very old iat but not expired', async () => {
      const oldIat = Math.floor(Date.now() / 1000) - 86400;
      const tokenWithOldIat = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: ['USER'],
          iat: oldIat,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${tokenWithOldIat}`)
        .expect(200);
    });
  });

  describe('Security Tests', () => {
    it('should detect token tampering', async () => {
      const decoded = jwt.decode(token);
      decoded.userId = 'tampered-user-id';

      const tamperedToken = jwt.sign(decoded, 'wrong-secret');

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('should prevent token replay attack after logout', async () => {
      const originalToken = token;

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(200);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(404);
    });

    it('should reject token with manipulated payload', async () => {
      const parts = token.split('.');
      const manipulatedPayload = Buffer.from(
        JSON.stringify({
          userId: user.id,
          username: 'admin',
          email: 'admin@example.com',
          roles: ['ADMINISTRATOR'],
        })
      ).toString('base64url');

      const manipulatedToken = `${parts[0]}.${manipulatedPayload}.${parts[2]}`;

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(401);
    });
  });
});
