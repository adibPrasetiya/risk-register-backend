import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';

describe('User Registration API - POST /users', () => {

  // Setup: Clear users before each test
  beforeEach(async () => {
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
        full_name: 'Test User'
      };

      const response = await request(app)
        .post('/users')
        .send(validUser)
        .expect(201);

      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(validUser.username);
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/users')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid password format', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak',  // Too weak
          full_name: 'Test'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Test@123456',
          full_name: 'Test'
        })
        .expect(400);
    });
  });

  describe('Duplicate Handling', () => {
    it('should return 409 for duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        email: 'first@example.com',
        password: 'Test@123456',
        full_name: 'First User'
      };

      // Create first user
      await request(app).post('/users').send(userData);

      // Try to create with same username
      const response = await request(app)
        .post('/users')
        .send({
          ...userData,
          email: 'second@example.com'  // Different email
        })
        .expect(409);

      expect(response.body.errors).toContain('sudah digunakan');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'Test@123456',
        full_name: 'First User'
      };

      await request(app).post('/users').send(userData);

      const response = await request(app)
        .post('/users')
        .send({
          ...userData,
          username: 'user2'  // Different username
        })
        .expect(409);
    });
  });
});
