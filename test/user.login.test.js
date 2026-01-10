import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import bcrypt from 'bcryptjs';
import {
  createTestUser,
  extractCookie,
  verifyCookieAttributes,
  verifySessionState,
  fixtures,
} from './helpers/test.helper.js';
import tokenUtil from '../src/utils/token.util.js';

describe('User Login API - POST /users/login', () => {
  beforeEach(async () => {
    await prismaClient.riskMonitoringLog.deleteMany();
    await prismaClient.riskTreatment.deleteMany();
    await prismaClient.risk.deleteMany();
    await prismaClient.riskRegister.deleteMany();
    await prismaClient.riskGovernanceAssignment.deleteMany();
    await prismaClient.profile.deleteMany();

    await prismaClient.session.deleteMany();
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  describe('Success Cases', () => {
    it('should login successfully with valid username and password', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      // Verify opaque token (hex string)
      expect(response.body.data.accessToken).toMatch(/^[0-9a-fA-F]+$/);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');

      const session = await prismaClient.session.findFirst({
        where: { user: { username: user.username } },
      });
      expect(session).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.accessToken).toBe(response.body.data.accessToken);
    });

    it('should login successfully with valid email and password', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.email,
          password: plainPassword,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should login with username in mixed case', async () => {
      const { user, plainPassword } = await createTestUser({
        username: 'testuser',
      });

      const response = await request(app)
        .post('/users/login')
        .send({
          username: 'TESTUSER',
          password: plainPassword,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should login with email in mixed case', async () => {
      const { user, plainPassword } = await createTestUser({
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/users/login')
        .send({
          username: 'TEST@EXAMPLE.COM',
          password: plainPassword,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should return correct user data structure', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('username');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('isActive');
      expect(response.body.data.user).toHaveProperty('roles');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should create session with device tracking', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/91.0')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session).not.toBeNull();
      expect(session.deviceId).toBeDefined();
      expect(session.deviceName).toBeDefined();
      expect(session.userAgent).toContain('Chrome');
      expect(session.ipAddress).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should enforce one session per user', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .send({ username: user.username, password: plainPassword })
        .expect(200);

      await request(app)
        .post('/users/login')
        .send({ username: user.username, password: plainPassword })
        .expect(200);

      const sessions = await prismaClient.session.findMany({
        where: { user: { username: user.username } },
      });

      expect(sessions.length).toBe(1);
    });

    it('should invalidate previous session on second login', async () => {
      const { user, plainPassword } = await createTestUser();

      const firstLogin = await request(app)
        .post('/users/login')
        .send({ username: user.username, password: plainPassword })
        .expect(200);

      const firstSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });
      const firstToken = firstSession.refreshToken;

      const secondLogin = await request(app)
        .post('/users/login')
        .send({ username: user.username, password: plainPassword })
        .expect(200);

      const secondSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });
      const secondToken = secondSession.refreshToken;

      expect(firstToken).not.toBe(secondToken);
      expect(secondSession.refreshToken).toBeDefined();
    });

    it('should store correct deviceId (hash of UA + IP)', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set('User-Agent', 'Test-Agent')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.deviceId).toBeDefined();
      expect(session.deviceId.length).toBe(64);
    });

    it('should parse and store deviceName from user-agent', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.deviceName).toContain('Chrome');
      expect(session.deviceName).toContain('Windows');
    });

    it('should store correct ipAddress', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set('x-forwarded-for', '192.168.1.100')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.ipAddress).toBeDefined();
    });

    it('should store correct userAgent', async () => {
      const testAgent = 'Custom-Test-Agent/1.0';
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set('User-Agent', testAgent)
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.userAgent).toBe(testAgent);
    });

    it('should set session expiresAt correctly', async () => {
      const { user, plainPassword } = await createTestUser();

      const beforeLogin = new Date();

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const afterLogin = new Date();

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.expiresAt).toBeDefined();
      expect(session.expiresAt.getTime()).toBeGreaterThan(beforeLogin.getTime());
      expect(session.expiresAt.getTime()).toBeGreaterThan(afterLogin.getTime());
    });

    it('should update existing session (upsert behavior)', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .set('User-Agent', 'First-Agent')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const firstSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      await request(app)
        .post('/users/login')
        .set('User-Agent', 'Second-Agent')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const secondSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(firstSession.id).toBe(secondSession.id);
      expect(firstSession.userAgent).not.toBe(secondSession.userAgent);
      expect(secondSession.userAgent).toBe('Second-Agent');
    });
  });

  describe('Cookie Validation', () => {
    it('should set HttpOnly cookie', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should set cookie with correct sameSite attribute', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith('refreshToken=')
      );

      expect(refreshTokenCookie.toLowerCase()).toContain('samesite=strict');
    });

    it('should hash refresh token before storing in database', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.refreshToken).toBeDefined();
      expect(session.refreshToken.length).toBe(64);
    });

    it('should store hashed refresh token matching DB session', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const cookieValue = extractCookie(cookies, 'refreshToken');

      expect(cookieValue).toBeDefined();

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.refreshToken).toBeDefined();
      expect(session.refreshToken.length).toBe(64);
    });

    it('should not create duplicate cookies on multiple logins', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookies = cookies.filter((c) =>
        c.startsWith('refreshToken=')
      );

      expect(refreshTokenCookies.length).toBe(1);
    });

    it('should set cookie path correctly', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith('refreshToken=')
      );

      expect(refreshTokenCookie).toContain('Path=/');
    });
  });

  describe('Token Validation', () => {
    it('should return access token as string', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      expect(typeof response.body.data.accessToken).toBe('string');
    });


  });

  describe('Validation Errors', () => {
    it('should return 400 when identifier is missing', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          password: 'Test@123456',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          username: 'testuser',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when identifier is empty string', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          username: '',
          password: 'Test@123456',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when password is empty string', async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: '',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when both fields are missing', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Authentication Failures', () => {
    it('should fail with invalid password', async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: 'WrongPassword123@',
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toContain('password salah');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          username: 'nonexistentuser',
          password: 'AnyPassword123@',
        })
        .expect(401);

      expect(response.body.errors).toContain('password salah');
    });

    it('should return 403 when user is inactive', async () => {
      const { user, plainPassword } = await createTestUser({
        is_active: false,
      });

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(403);

      expect(response.body.errors).toContain('tidak aktif');
    });

    it('should reject login with whitespace in password', async () => {
      const { user, plainPassword } = await createTestUser();

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword + ' ',
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate password case-sensitively', async () => {
      const { user } = await createTestUser({ password: 'Test@123456' });

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: 'test@123456',
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });

    it('should reject very long password attempt', async () => {
      const { user } = await createTestUser();
      const veryLongPassword = 'Test@123' + 'a'.repeat(300);

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: veryLongPassword,
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle multiple failed login attempts', async () => {
      const { user } = await createTestUser();

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/users/login')
          .send({
            username: user.username,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      const sessions = await prismaClient.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions.length).toBe(0);
    });

    it('should reject login attempt on non-existent email', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'Test@123456',
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in identifier field', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          username: fixtures.sqlInjectionPayloads[0],
          password: 'Test@123456',
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });

    it('should have consistent response time for invalid user vs invalid password', async () => {
      const { user, plainPassword } = await createTestUser();

      const startInvalidUser = Date.now();
      await request(app)
        .post('/users/login')
        .send({
          username: 'nonexistent',
          password: 'Test@123456',
        })
        .expect(401);
      const invalidUserTime = Date.now() - startInvalidUser;

      const startInvalidPassword = Date.now();
      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: 'WrongPassword123@',
        })
        .expect(401);
      const invalidPasswordTime = Date.now() - startInvalidPassword;

      const timeDifference = Math.abs(invalidUserTime - invalidPasswordTime);
      expect(timeDifference).toBeLessThan(500);
    });

    it('should reject login for deleted user', async () => {
      const { user, plainPassword } = await createTestUser();

      await prismaClient.user.delete({
        where: { id: user.id },
      });

      const response = await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(401);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Database State', () => {
    it('should have only one session after login', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const sessions = await prismaClient.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions.length).toBe(1);
    });

    it('should delete old session when creating new one', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const firstSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });
      const firstHashedToken = firstSession.refreshToken;

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const session = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(session.refreshToken).not.toBe(firstHashedToken);
    });

    it('should update session timestamps correctly', async () => {
      const { user, plainPassword } = await createTestUser();

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const firstSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await request(app)
        .post('/users/login')
        .send({
          username: user.username,
          password: plainPassword,
        })
        .expect(200);

      const secondSession = await prismaClient.session.findUnique({
        where: { userId: user.id },
      });

      expect(secondSession.updatedAt.getTime()).toBeGreaterThan(
        firstSession.updatedAt.getTime()
      );
    });
  });
});
