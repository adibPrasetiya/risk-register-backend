# Panduan Testing

Dokumen ini berisi panduan lengkap untuk menulis dan menjalankan tests dalam project Risk Register.

## 📋 Daftar Isi

- [Testing Philosophy](#-testing-philosophy)
- [Running Tests](#-running-tests)
- [Writing Tests](#-writing-tests)
- [Test Structure](#-test-structure)
- [Testing Patterns](#-testing-patterns)
- [Coverage Requirements](#-coverage-requirements)
- [Best Practices](#-best-practices)

## 🎯 Testing Philosophy

### Prinsip Testing:

1. **Tests sebagai Documentation**
   - Tests menjelaskan bagaimana code seharusnya bekerja
   - Readable dan self-explanatory

2. **Fast Feedback**
   - Tests harus cepat dijalankan
   - Isolasi tests untuk debugging mudah

3. **Confidence in Changes**
   - Tests memastikan refactoring tidak merusak functionality
   - Regression prevention

## 🏃 Running Tests

### Basic Commands:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Coverage Report:

```bash
npm run test:coverage
# Open coverage/index.html
```

## ✍️ Writing Tests

### Test File Naming:

Format: `<feature>.<test-type>.test.js`

```
test/
├── user.registration.test.js
├── user.login.test.js
└── role.assignment.test.js
```


## 🏗️ Test Structure

### AAA Pattern (Arrange-Act-Assert):

```javascript
it('should register new user', async () => {
  // Arrange - Setup test data
  const userData = {
    username: 'john',
    email: 'john@example.com',
    password: 'Test@123',
    full_name: 'John Doe'
  };

  // Act - Execute action
  const response = await request(app)
    .post('/users')
    .send(userData);

  // Assert - Verify results
  expect(response.status).toBe(201);
  expect(response.body.data.username).toBe('john');
  expect(response.body.data).not.toHaveProperty('password');
});
```

### Organize by Feature:

```javascript
describe('User Registration API - POST /users', () => {
  
  describe('Success Cases', () => {
    it('should register user with valid data', async () => {
      // ...
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing fields', async () => {
      // ...
    });
    
    it('should return 400 for invalid email', async () => {
      // ...
    });
  });

  describe('Duplicate Handling', () => {
    it('should return 409 for duplicate username', async () => {
      // ...
    });
  });
});
```

## 🧪 Testing Patterns

### 1. API Endpoint Testing

```javascript
describe('POST /users', () => {
  it('should create user successfully', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        username: 'test',
        email: 'test@example.com',
        password: 'Test@123',
        full_name: 'Test User'
      })
      .expect(201);

    expect(response.body.message).toBe('Registrasi user berhasil');
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### 2. Validation Testing

```javascript
describe('Validation', () => {
  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        username: 'test',
        email: 'invalid-email',
        password: 'Test@123',
        full_name: 'Test'
      })
      .expect(400);

    expect(response.body).toHaveProperty('errors');
  });
});
```

### 3. Error Handling Testing

```javascript
describe('Error Handling', () => {
  it('should handle duplicate username', async () => {
    // Create first user
    await request(app)
      .post('/users')
      .send(userData);

    // Try duplicate
    const response = await request(app)
      .post('/users')
      .send(userData)
      .expect(409);

    expect(response.body.errors).toContain('sudah digunakan');
  });
});
```

### 4. Database Testing

```javascript
describe('Database Operations', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prismaClient.userRole.deleteMany();
    await prismaClient.user.deleteMany();
  });

  it('should save user to database', async () => {
    await request(app)
      .post('/users')
      .send(userData);

    const user = await prismaClient.user.findUnique({
      where: { username: userData.username }
    });

    expect(user).not.toBeNull();
    expect(user.email).toBe(userData.email);
  });
});
```


## 📊 Coverage Requirements

### Minimum Coverage:

- **Overall**: 80% minimum
- **New Code**: 80% minimum
- **Critical Paths**: 100% (auth, validation, payment)

### What to Cover:

✅ **MUST Test:**
- API endpoints (all methods)
- Validation logic
- Error handling
- Business logic
- Database operations

⚠️ **SHOULD Test:**
- Edge cases
- Boundary conditions
- Integration points

❌ **SKIP:**
- Third-party libraries
- Configuration files
- Auto-generated code (Prisma client)

### Coverage Commands:

```bash
# Generate report
npm run test:coverage

# View in browser
# Open coverage/index.html

# Check coverage thresholds
# Configured in package.json jest config
```

## 📝 Best Practices

### 1. Test Naming

✅ **GOOD:**
```javascript
it('should return 409 when username already exists', async () => {
  // Test implementation
});
```

❌ **BAD:**
```javascript
it('test 1', async () => {
  // Test implementation
});
```

### 2. One Assertion per Test (When Possible)

✅ **GOOD:**
```javascript
it('should return 201 status code', async () => {
  const response = await request(app).post('/users').send(data);
  expect(response.status).toBe(201);
});

it('should return user data', async () => {
  const response = await request(app).post('/users').send(data);
  expect(response.body.data).toHaveProperty('id');
});
```

### 3. Clean Database Between Tests

```javascript
beforeEach(async () => {
  // Clean up database
  await prismaClient.userRole.deleteMany();
  await prismaClient.user.deleteMany();
});
```

### 4. Use Descriptive Variable Names

```javascript
// ✅ GOOD
const validUserData = {
  username: 'johndoe',
  email: 'john@example.com'
};

// ❌ BAD
const data = {
  u: 'johndoe',
  e: 'john@example.com'
};
```

### 5. Test Both Success and Failure

```javascript
describe('User Login', () => {
  it('should login with correct credentials', async () => {
    // Success case
  });

  it('should reject invalid credentials', async () => {
    // Failure case
  });
});
```

### 6. Don't Test Implementation Details

```javascript
// ❌ BAD - Testing implementation
it('should call bcrypt.hash', async () => {
  const spy = jest.spyOn(bcrypt, 'hash');
  await createUser(data);
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD - Testing behavior
it('should not return plain password', async () => {
  const response = await request(app).post('/users').send(data);
  expect(response.body.data).not.toHaveProperty('password');
});
```

### 7. Setup Test Data Factory (Optional)

```javascript
// test/factories/user.factory.js
export const createUserData = (overrides = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test@123456',
  full_name: 'Test User',
  ...overrides
});

// In test
const userData = createUserData({ 
  username: 'customuser' 
});
```

## 🚨 Common Pitfalls

### 1. Forgetting to Disconnect Prisma

```javascript
// Always add this
afterAll(async () => {
  await prismaClient.$disconnect();
});
```

### 2. Not Cleaning Database

```javascript
// Can cause flaky tests
beforeEach(async () => {
  await prismaClient.user.deleteMany();
});
```

### 3. Hard-coding Values

```javascript
// ❌ BAD
expect(response.body.data.id).toBe('123e4567-e89b-12d3');

// ✅ GOOD
expect(response.body.data.id).toBeDefined();
expect(typeof response.body.data.id).toBe('string');
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

**Happy Testing! 🧪**

