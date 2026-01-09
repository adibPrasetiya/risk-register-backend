import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import {
  generateString,
  verifyTokenStructure,
  verifyPasswordIsHashed,
  fixtures,
} from './helpers/test.helper.js';

describe('User Registration API - POST /users', () => {
  // Setup: Clear users before each test
  beforeEach(async () => {
    await prismaClient.session.deleteMany();
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();
  });

  // Cleanup: Disconnect after all tests
  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  describe('Success Cases', () => {
    it('should register new user with valid data', async () => {
      const validUser = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'Test@123456',
        full_name: 'Test User',
      };

      const response = await request(app)
        .post('/users')
        .send(validUser)
        .expect(201);

      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(validUser.username);
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should convert username to lowercase when registration succeeds', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'MixedCaseUser',
          email: 'mixed@example.com',
          password: 'Test@123456',
          full_name: 'Mixed Case User',
        })
        .expect(201);

      expect(response.body.data.user.username).toBe('mixedcaseuser');
    });

    it('should accept special characters in full_name', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'unicodeuser',
          email: 'unicode@example.com',
          password: 'Test@123456',
          full_name: 'José García-O\'Brien',
        })
        .expect(201);

      expect(response.body.data.user.full_name).toBe('José García-O\'Brien');
    });
  });

  describe('Validation Errors', () => {
    describe('Username Validation', () => {
      it('should return 400 when username is too short (< 3 characters)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'ab',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('minimal 3 karakter');
      });

      it('should return 400 when username is too long (> 255 characters)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: generateString(256),
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('maksimal 255 karakter');
      });

      it('should return 400 when username contains spaces', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'test user',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('huruf, angka, dan underscore');
      });

      it('should return 400 when username contains @ symbol', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'test@user',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when username contains dot', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'test.user',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should accept username with only numbers', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: '12345',
            email: 'numbers@example.com',
            password: 'Test@123456',
            full_name: 'Numbers User',
          })
          .expect(201);

        expect(response.body.data.user.username).toBe('12345');
      });

      it('should accept username starting with underscore', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: '_testuser',
            email: 'underscore@example.com',
            password: 'Test@123456',
            full_name: 'Underscore User',
          })
          .expect(201);

        expect(response.body.data.user.username).toBe('_testuser');
      });

      it('should return 400 when username is empty', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: '',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('Email Validation', () => {
      it('should return 400 for invalid email format', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'invalid-email',
            password: 'Test@123456',
            full_name: 'Test',
          })
          .expect(400);

        expect(response.body.errors).toContain('email tidak valid');
      });

      it('should return 400 when email has no @ symbol', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'testexample.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email has no domain', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email has multiple @ symbols', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email is too long (> 255 characters)', async () => {
        const longEmail = generateString(250) + '@test.com';
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: longEmail,
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email contains spaces', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test @example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email is empty', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: '',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('Password Validation', () => {
      it('should return 400 for invalid password format', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'weak',
            full_name: 'Test',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when password is too short (< 8 characters)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@12',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('minimal 8 karakter');
      });

      it('should return 400 when password has no uppercase letter', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('huruf kapital');
      });

      it('should return 400 when password has no lowercase letter', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'TEST@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('huruf kecil');
      });

      it('should return 400 when password has no number', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@abcdef',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('angka');
      });

      it('should return 400 when password has no special character', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test1234567',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('karakter spesial');
      });

      it('should return 400 when password has invalid special character', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test123~~~',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when password is too long (> 255 characters)', async () => {
        const longPassword = 'Test@123' + generateString(250);
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: longPassword,
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toContain('maksimal 255 karakter');
      });

      it('should return 400 when password contains spaces', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@ 123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should accept password with all allowed special characters', async () => {
        const specialChars = '@$!%*?&#^()_-+=';
        const testCases = specialChars.split('').map((char, index) => ({
          char,
          username: `user${index}`,
          email: `test${index}@example.com`,
          password: `Test123${char}abc`,
        }));

        for (const testCase of testCases) {
          const response = await request(app)
            .post('/users')
            .send({
              username: testCase.username,
              email: testCase.email,
              password: testCase.password,
              full_name: `Test User ${testCase.char}`,
            })
            .expect(201);

          expect(response.body.data.user).toHaveProperty('id');
        }
      });

      it('should accept minimum valid password (exactly 8 chars)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'minuser',
            email: 'min@example.com',
            password: 'A1b@cdef',
            full_name: 'Min User',
          })
          .expect(201);

        expect(response.body.data.user).toHaveProperty('id');
      });

      it('should return 400 when password is empty', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: '',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('Full Name Validation', () => {
      it('should return 400 when full_name is too short (< 2 characters)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'A',
          })
          .expect(400);

        expect(response.body.errors).toContain('minimal 2 karakter');
      });

      it('should return 400 when full_name is too long (> 255 characters)', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: generateString(256),
          })
          .expect(400);

        expect(response.body.errors).toContain('maksimal 255 karakter');
      });

      it('should return 400 when full_name is empty', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: '',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should accept full_name with Unicode characters', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'unicodeuser2',
            email: 'unicode2@example.com',
            password: 'Test@123456',
            full_name: 'Müller François 李明',
          })
          .expect(201);

        expect(response.body.data.user.full_name).toBe('Müller François 李明');
      });
    });

    describe('Missing Fields', () => {
      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/users')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      });

      it('should return 400 when username is missing', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            email: 'test@example.com',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when email is missing', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            password: 'Test@123456',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            full_name: 'Test User',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when full_name is missing', async () => {
        const response = await request(app)
          .post('/users')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@123456',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });
  });

  describe('Duplicate Handling', () => {
    it('should return 409 for duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        email: 'first@example.com',
        password: 'Test@123456',
        full_name: 'First User',
      };

      // Create first user
      await request(app).post('/users').send(userData);

      // Try to create with same username
      const response = await request(app)
        .post('/users')
        .send({
          ...userData,
          email: 'second@example.com',
        })
        .expect(409);

      expect(response.body.errors).toContain('sudah digunakan');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'Test@123456',
        full_name: 'First User',
      };

      await request(app).post('/users').send(userData);

      const response = await request(app)
        .post('/users')
        .send({
          ...userData,
          username: 'user2',
        })
        .expect(409);

      expect(response.body.errors).toContain('sudah digunakan');
    });

    it('should return 409 for duplicate username (case insensitive)', async () => {
      await request(app)
        .post('/users')
        .send({
          username: 'CaseSensitive',
          email: 'case1@example.com',
          password: 'Test@123456',
          full_name: 'Case User 1',
        })
        .expect(201);

      const response = await request(app)
        .post('/users')
        .send({
          username: 'casesensitive',
          email: 'case2@example.com',
          password: 'Test@123456',
          full_name: 'Case User 2',
        })
        .expect(409);

      expect(response.body.errors).toContain('sudah digunakan');
    });

    it('should return 409 for duplicate email (case insensitive)', async () => {
      await request(app)
        .post('/users')
        .send({
          username: 'emailuser1',
          email: 'TEST@example.com',
          password: 'Test@123456',
          full_name: 'Email User 1',
        })
        .expect(201);

      const response = await request(app)
        .post('/users')
        .send({
          username: 'emailuser2',
          email: 'test@example.com',
          password: 'Test@123456',
          full_name: 'Email User 2',
        })
        .expect(409);

      expect(response.body.errors).toContain('sudah digunakan');
    });
  });

  describe('Response Structure Validation', () => {
    it('should not return password in response', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'secureuser',
          email: 'secure@example.com',
          password: 'Test@123456',
          full_name: 'Secure User',
        })
        .expect(201);

      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should store password as bcrypt hash in database', async () => {
      const plainPassword = 'Test@123456';
      const response = await request(app)
        .post('/users')
        .send({
          username: 'hashuser',
          email: 'hash@example.com',
          password: plainPassword,
          full_name: 'Hash User',
        })
        .expect(201);

      const userId = response.body.data.user.id;
      await verifyPasswordIsHashed(userId, plainPassword);
    });

    it('should assign USER role to new user', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'roleuser',
          email: 'role@example.com',
          password: 'Test@123456',
          full_name: 'Role User',
        })
        .expect(201);

      const userId = response.body.data.user.id;
      const userRole = await prismaClient.userRole.findFirst({
        where: { userId },
        include: { role: true },
      });

      expect(userRole).not.toBeNull();
      expect(userRole.role.name).toBe('USER');
    });

    it('should set is_active to true by default', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'activeuser',
          email: 'active@example.com',
          password: 'Test@123456',
          full_name: 'Active User',
        })
        .expect(201);

      expect(response.body.data.user.is_active).toBe(true);
    });

    it('should include timestamps in response', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'timeuser',
          email: 'time@example.com',
          password: 'Test@123456',
          full_name: 'Time User',
        })
        .expect(201);

      expect(response.body.data.user).toHaveProperty('created_at');
      expect(response.body.data.user).toHaveProperty('updated_at');
      expect(response.body.data.user.created_at).toBeDefined();
      expect(response.body.data.user.updated_at).toBeDefined();
    });
  });

  describe('Database State Verification', () => {
    it('should create UserRole record correctly', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'dbuser',
          email: 'db@example.com',
          password: 'Test@123456',
          full_name: 'DB User',
        })
        .expect(201);

      const userId = response.body.data.user.id;
      const userRoles = await prismaClient.userRole.findMany({
        where: { userId },
      });

      expect(userRoles).toHaveLength(1);
    });

    it('should not create Session on registration', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'nosession',
          email: 'nosession@example.com',
          password: 'Test@123456',
          full_name: 'No Session User',
        })
        .expect(201);

      const userId = response.body.data.user.id;
      const session = await prismaClient.session.findUnique({
        where: { userId },
      });

      expect(session).toBeNull();
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in username field', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: fixtures.sqlInjectionPayloads[0],
          email: 'sql@example.com',
          password: 'Test@123456',
          full_name: 'SQL Test',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle XSS attempt in full_name field', async () => {
      const xssPayload = fixtures.xssPayloads[0];
      const response = await request(app)
        .post('/users')
        .send({
          username: 'xssuser',
          email: 'xss@example.com',
          password: 'Test@123456',
          full_name: xssPayload,
        })
        .expect(201);

      const user = await prismaClient.user.findUnique({
        where: { username: 'xssuser' },
        include: { profile: true },
      });

      expect(user.profile.fullName).toBe(xssPayload);
    });

    it('should handle very long input strings (boundary test)', async () => {
      const veryLongUsername = generateString(300);
      const response = await request(app)
        .post('/users')
        .send({
          username: veryLongUsername,
          email: 'boundary@example.com',
          password: 'Test@123456',
          full_name: 'Boundary User',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle null byte injection in username', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'user\0admin',
          email: 'null@example.com',
          password: 'Test@123456',
          full_name: 'Null Byte User',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});
