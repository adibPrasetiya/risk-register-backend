# Panduan Development

Dokumen ini berisi workflow development dan best practices untuk project Risk Register.

## 📋 Daftar Isi

- [Development Setup](#-development-setup)
- [Development Workflow](#-development-workflow)
- [Feature Development](#-feature-development)
- [Bug Fix Process](#-bug-fix-process)
- [Database Migrations](#-database-migrations)
- [API Development](#-api-development)
- [Error Handling](#-error-handling)
- [Security Guidelines](#-security-guidelines)

## 🛠 Development Setup

### 1. Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd risk-register

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi lokal Anda

# Setup database
npx prisma migrate dev
npm run seed
```

### 2. IDE Setup (Recommended)

**VS Code Extensions:**
- ESLint
- Prettier
- Prisma
- GitLens
- Thunder Client / REST Client

**Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. Verify Setup

```bash
# Run tests
npm test

# Start dev server
npm run dev

# Open http://localhost:3000
# Server should be running
```

## 🔄 Development Workflow

### Daily Workflow:

```bash
# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/123-your-feature

# 3. Develop with hot reload
npm run dev

# 4. Run tests frequently
npm run test:watch

# 5. Commit changes
git add .
git commit -m "feat(scope): description"

# 6. Push and create PR
git push origin feature/123-your-feature
```

### Code-Test Cycle:

```
Write Code → Run Tests → Fix Errors → Commit → Repeat
```

## 🚀 Feature Development

### Process:

1. **Planning**
   - Pahami requirement
   - Design API endpoint
   - Plan database schema changes

2. **Implementation**
   - Create migration (jika perlu)
   - Write validation schema
   - Implement service logic
   - Create controller
   - Add route

3. **Testing**
   - Write unit tests
   - Test manually dengan Thunder Client
   - Verify edge cases

4. **Documentation**
   - Update API documentation
   - Add code comments jika perlu

### Example: Adding Login Endpoint

#### Step 1: Database (jika perlu)

```bash
# Jika perlu kolom baru
npx prisma migrate dev --name add_login_fields
```

#### Step 2: Validation Schema

```javascript
// src/validators/auth.validation.js
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
```

#### Step 3: Service Layer

```javascript
// src/services/auth.service.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const login = async (credentials) => {
  // Validate input
  const data = validate(loginSchema, credentials);
  
  // Find user
  const user = await prismaClient.user.findUnique({
    where: { email: data.email }
  });
  
  if (!user) {
    throw new ResponseError(401, 'Invalid credentials');
  }
  
  // Verify password
  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new ResponseError(401, 'Invalid credentials');
  }
  
  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  
  return { token, user };
};

export default { login };
```

#### Step 4: Controller

```javascript
// src/controllers/auth.controller.js
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export default { login };
```

#### Step 5: Route

```javascript
// src/routers/public.route.js
const routes = [
  {
    method: 'post',
    path: '/auth/login',
    handler: authController.login
  }
];
```

#### Step 6: Tests

```javascript
// test/auth.login.test.js
describe('POST /auth/login', () => {
  it('should login with valid credentials', async () => {
    // Setup: Create user first
    await request(app).post('/users').send(userData);
    
    // Test login
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);
    
    expect(response.body.data).toHaveProperty('token');
  });
});
```


## 🐛 Bug Fix Process

### Process:

1. **Reproduce Bug**
   - Understand the issue
   - Create failing test case
   
2. **Fix**
   - Implement fix
   - Ensure test passes
   
3. **Verify**
   - Run all tests
   - Manual testing
   
4. **Document**
   - Update changelog if needed

### Example:

```javascript
// 1. Write failing test
it('should handle special characters in username', async () => {
  const response = await request(app)
    .post('/users')
    .send({
      username: 'user@name',
      email: 'test@example.com',
      password: 'Test@123',
      full_name: 'Test'
    });
    
  // This currently fails
  expect(response.status).toBe(400);
});

// 2. Fix validation
username: Joi.string()
  .pattern(/^[a-zA-Z0-9_]+$/)  // Only alphanumeric and underscore
  .required()

// 3. Test passes now
```

## 🗄️ Database Migrations

### Creating Migration:

```bash
# Create migration
npx prisma migrate dev --name descriptive_name

# Examples:
npx prisma migrate dev --name add_user_status
npx prisma migrate dev --name create_posts_table
```

### Migration Workflow:

```bash
# 1. Edit schema.prisma
# Add new field or model

# 2. Create migration
npx prisma migrate dev --name add_phone_field

# 3. Update types
npx prisma generate

# 4. Update seed if needed
# Edit prisma/seed.js

# 5. Test migration
npm run seed
```

### Migration Best Practices:

✅ **DO:**
- Descriptive migration names
- Test migrations on dev first
- Add default values for NOT NULL columns
- Document breaking changes

❌ **DON'T:**
- Edit existing migrations
- Delete migrations
- Skip migrations in production
- Add NOT NULL without default

## 🔌 API Development

### REST API Standards:

**HTTP Methods:**
- `GET` - Retrieve data
- `POST` - Create new resource
- `PUT` - Full update
- `PATCH` - Partial update
- `DELETE` - Delete resource

**Status Codes:**
- `200` OK - Success
- `201` Created - Resource created
- `400` Bad Request - Validation error
- `401` Unauthorized - Not authenticated
- `403` Forbidden - No permission
- `404` Not Found - Resource not found
- `409` Conflict - Duplicate
- `500` Internal Server Error

### Response Format:

**Success:**
```json
{
  "message": "Success message",
  "data": {
    "id": "123",
    "username": "john"
  }
}
```

**Error:**
```json
{
  "errors": "Error message",
  "details": [
    {
      "path": "email",
      "detail": "Email tidak valid"
    }
  ]
}
```

### Endpoint Naming:

✅ **GOOD:**
```
GET    /users          # List users
GET    /users/:id      # Get user
POST   /users          # Create user
PUT    /users/:id      # Update user
DELETE /users/:id      # Delete user
```

❌ **BAD:**
```
GET    /getAllUsers
POST   /createUser
GET    /user/get/:id
```

## 🛡️ Error Handling

### Using Custom Errors:

```javascript
// Service layer
if (!user) {
  throw new ResponseError(404, 'User tidak ditemukan');
}

if (validationFails) {
  throw new ValidationError([
    { path: 'email', detail: 'Email tidak valid' }
  ]);
}
```

### Error Middleware:

Error middleware automatically handles:
- ResponseError → HTTP status + message
- ValidationError → 400 + validation details
- Unknown errors → 500 + generic message

### Error Handling Pattern:

```javascript
// Controller
const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);  // Pass to error middleware
  }
};
```

## 🔐 Security Guidelines

### 1. Password Security

```javascript
// Always hash passwords
const hashedPassword = await bcrypt.hash(password, 10);

// Never return passwords in response
const user = await prisma.user.create({
  data: userData,
  select: {
    id: true,
    email: true,
    // password: false (implicit)
  }
});
```

### 2. Input Validation

```javascript
// Always validate input
const validatedData = validate(schema, request);

// Sanitize user input
const sanitized = validator.escape(userInput);
```

### 3. SQL Injection Prevention

```javascript
// ✅ GOOD - Prisma prevents SQL injection
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

// ❌ BAD - Never use raw queries with user input
// await prisma.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`);
```

### 4. Environment Variables

```javascript
// Never commit .env
// Add to .gitignore
.env
.env.local
.env.*.local

// Use .env.example as template
```

## 📝 Code Quality

### Before Committing:

```bash
# 1. Run tests
npm test

# 2. Check for console.log
grep -r "console.log" src/

# 3. Verify no TODO comments (or document them)
grep -r "TODO" src/

# 4. Run linter (if configured)
npm run lint
```

### Code Review Checklist:

- [ ] Code follows style guidelines
- [ ] Tests included and passing
- [ ] No hardcoded values
- [ ] Error handling complete
- [ ] No security vulnerabilities
- [ ] Documentation updated

## 🚀 Deployment Preparation

### Pre-deployment Checklist:

- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Seed data prepared
- [ ] API documentation updated
- [ ] Security review completed
- [ ] Performance tested

---

**Happy Coding! 💻**

