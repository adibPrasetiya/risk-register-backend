import request from 'supertest';
import { app } from '../src/app/server.js';
import { prismaClient } from '../src/app/database.js';
import bcrypt from 'bcryptjs';

describe('Auth Middleware & Logout', () => {
  let token;
  let user;

  beforeEach(async () => {
    await prismaClient.session.deleteMany();
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();

    const password = await bcrypt.hash('Test@123456', 10);
    user = await prismaClient.user.create({
      data: {
        username: 'authtest',
        email: 'authtest@example.com',
        full_name: 'Auth Test',
        password: password,
        is_active: true
      }
    });

    const role = await prismaClient.role.upsert({
        where: { name: 'USER' },
        update: {},
        create: { name: 'USER' }
    });

    await prismaClient.userRole.create({
        data: { userId: user.id, roleId: role.id }
    });

    // Login to get token
    const response = await request(app)
      .post('/users/login')
      .send({ identifier: 'authtest', password: 'Test@123456' });
    
    token = response.body.data.accessToken;
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  it('should allow access to protected route with valid token', async () => {
    // Calling logout as a protected route test
    const response = await request(app)
      .delete('/users/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toBe('OK');
  });

  it('should reject access without token', async () => {
    await request(app)
      .delete('/users/logout')
      .expect(401);
  });

  it('should reject access with invalid token', async () => {
    await request(app)
      .delete('/users/logout')
      .set('Authorization', 'Bearer invalidtoken')
      .expect(401);
  });

  it('should actually remove session on logout', async () => {
    // Verify session exists
    let session = await prismaClient.session.findFirst({
        where: { userId: user.id }
    });
    expect(session).not.toBeNull();

    // Logout
    await request(app)
      .delete('/users/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify session removed
    session = await prismaClient.session.findFirst({
        where: { userId: user.id }
    });
    expect(session).toBeNull();
  });
});
