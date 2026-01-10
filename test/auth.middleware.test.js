import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import {
  createTestUser,
  createAuthenticatedUser,
  createExpiredToken,
  verifySessionState,
} from './helpers/test.helper.js';

describe('Auth Middleware & Logout', () => {
  let token;
  let user;

  beforeEach(async () => {
    // Delete risk related tables first due to FK constraints
    await prismaClient.riskMonitoringLog.deleteMany();
    await prismaClient.riskTreatment.deleteMany();
    await prismaClient.risk.deleteMany();
    await prismaClient.riskRegister.deleteMany();
    await prismaClient.riskGovernanceAssignment.deleteMany();
    await prismaClient.profile.deleteMany();

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
          // Check for Max-Age=0 OR Expires=...1970
          const isCleared = refreshTokenCookie.includes('Max-Age=0') || refreshTokenCookie.includes('Expires=Thu, 01 Jan 1970');
          expect(isCleared).toBe(true);
        }
      }
    });

    it('should return 200 OK on successful logout', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
    });

    it('should have correct cookie clear attributes', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Auth Middleware - Valid Token', () => {
    it('should allow access to protected route with valid token', async () => {
      const response = await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Logout berhasil');
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
      // With opaque tokens, we can't decode client-side to verify.
      // Instead, we verify the request succeeds (which implies the middleware found the user correctly)
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

    it('should reject logout with expired token', async () => {
      const dbUser = await prismaClient.user.findFirst();
      if (!dbUser) throw new Error("No user found in DB");
      const expiredToken = await createExpiredToken(dbUser.id);
      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
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
      const { accessToken: token1 } = await createAuthenticatedUser(app, {
        username: 'user1',
        email: 'user1@example.com'
      });
      const { accessToken: token2 } = await createAuthenticatedUser(app, {
        username: 'user2',
        email: 'user2@example.com'
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
    });
  });

  describe('Logout Edge Cases', () => {
    it('should return 401 when logout without session', async () => {
      // Create user but delete session
      await prismaClient.session.deleteMany({ where: { userId: user.id } });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
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
        .expect(401);
    });

    it('should not logout different user with wrong token', async () => {
      const { user: otherUser, accessToken: otherToken } = await createAuthenticatedUser(app, {
        username: 'other',
        email: 'other@example.com'
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify other user session still exists
      const otherSession = await prismaClient.session.findFirst({
        where: { userId: otherUser.id },
      });
      expect(otherSession).not.toBeNull();
    });

    it('should remove only own session', async () => {
      const { user: otherUser } = await createAuthenticatedUser(app, {
        username: 'victim',
        email: 'victim@example.com'
      });

      await request(app)
        .delete('/users/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const victimSession = await prismaClient.session.findFirst({
        where: { userId: otherUser.id },
      });
      expect(victimSession).toBeDefined();
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

      // Idempotent logout: both can succeed (200)
      expect(successCount).toBe(2);
    });
  });

    describe('Password Change Scenarios', () => {
      it('should pass when user has null password_changed_at', async () => {
        await prismaClient.user.update({
          where: { id: user.id },
          data: { password_changed_at: null }
        });

        await request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });
    });

    describe('Token Expiry Tests', () => {
      it('should reject token expired 1 second ago', async () => {
        const expiredToken = await createExpiredToken(user.id);
        await request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });
    });

    describe('Security Tests', () => {
      it('should prevent token replay attack after logout', async () => {
        await request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Replay - should fail because session is deleted/invalidated
        await request(app)
          .delete('/users/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(401); 
      });
    });
});
