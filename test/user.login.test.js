import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import bcrypt from 'bcryptjs';

describe('User Login API - POST /users/login', () => {
  beforeEach(async () => {
    await prismaClient.session.deleteMany();
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();
    // Don't delete Roles, assume they exist or are static
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  const createTestUser = async () => {
    const password = await bcrypt.hash('Test@123456', 10);
    const user = await prismaClient.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password: password,
        is_active: true
      }
    });
    
    // Ensure Role exists
    const role = await prismaClient.role.upsert({
        where: { name: 'USER' },
        update: {},
        create: { name: 'USER' }
    });

    await prismaClient.userRole.create({
        data: {
            userId: user.id,
            roleId: role.id
        }
    });

    return user;
  };

  it('should login successfully with valid username and password', async () => {
    await createTestUser();

    const response = await request(app)
      .post('/users/login')
      .send({
        identifier: 'testuser',
        password: 'Test@123456'
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
    
    // Check Cookie
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toContain('HttpOnly');
    
    // Verify Session in DB
    const session = await prismaClient.session.findFirst({
        where: { user: { username: 'testuser' } }
    });
    expect(session).toBeDefined();
    expect(session.refreshToken).toBeDefined();
  });

  it('should login successfully with valid email and password', async () => {
    await createTestUser();

    const response = await request(app)
      .post('/users/login')
      .send({
        identifier: 'test@example.com', // sending email in identifier field
        password: 'Test@123456'
      })
      .expect(200);

    expect(response.body.data).toHaveProperty('accessToken');
  });

  it('should fail with invalid password', async () => {
    await createTestUser();

    const response = await request(app)
      .post('/users/login')
      .send({
        identifier: 'testuser',
        password: 'WrongPassword'
      })
      .expect(401);

    expect(response.body.errors).toBeDefined();
  });

  it('should fail with non-existent user', async () => {
    const response = await request(app)
      .post('/users/login')
      .send({
        identifier: 'unknown',
        password: 'AnyPassword'
      })
      .expect(401);
  });

  it('should enforce one session per user', async () => {
    await createTestUser();

    // First Login
    const login1 = await request(app)
      .post('/users/login')
      .send({ identifier: 'testuser', password: 'Test@123456' })
      .expect(200);
    
    const token1 = login1.headers['set-cookie'][0];

    // Second Login
    const login2 = await request(app)
      .post('/users/login')
      .send({ identifier: 'testuser', password: 'Test@123456' })
      .expect(200);

    // Verify only 1 session exists
    const sessions = await prismaClient.session.findMany({
        where: { user: { username: 'testuser' } }
    });
    
    expect(sessions.length).toBe(1);
    
    // The session should contain the new token
    // Note: Since we don't return refresh token in body, we can't easily compare with response body,
    // but we know upsert updates the record.
  });
});
