# Risk Register Backend

Backend API untuk aplikasi Risk Register yang dibangun dengan Express.js dan Prisma ORM.

## 📋 Daftar Isi

- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Database Setup](#-database-setup)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Testing](#-testing)
- [Struktur Project](#-struktur-project)
- [API Endpoints](#-api-endpoints)
- [Tim](#-tim)

## 🚀 Tech Stack

- **Runtime**: Node.js (Latest)
- **Framework**: Express.js 5.2.1
- **Database**: MySQL
- **ORM**: Prisma 6.11.1
- **Validation**: Joi 18.0.2
- **Authentication**: JSON Web Token 9.0.3
- **Password Hashing**: bcryptjs 3.0.3
- **Testing**: Jest 30.2.0 + Supertest 7.1.4
- **Dev Tools**: Nodemon, Babel

## 📦 Prerequisites

Pastikan Anda telah menginstal:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Git**

## 🛠 Instalasi

1. **Clone repository**

   ```bash
   git clone <repository-url>
   cd risk-register
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

## ⚙️ Konfigurasi

1. **Buat file `.env`** di root directory:

   ```bash
   cp .env.example .env
   ```

2. **Isi konfigurasi** di file `.env`:

   ```env
   # Server Configuration
   APP_PORT=3000

   # Database Configuration
   DATABASE_URL="mysql://username:password@localhost:3306/risk_register"
   ```

   Ganti `username`, `password`, dan `risk_register` sesuai dengan konfigurasi MySQL Anda.

## 🗄️ Database Setup

1. **Buat database MySQL**

   ```sql
   CREATE DATABASE risk_register CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Jalankan migrations**

   ```bash
   npx prisma migrate deploy
   ```

   Atau untuk development:

   ```bash
   npx prisma migrate dev
   ```

3. **Seed database** (roles default)

   ```bash
   npm run seed
   ```

   Ini akan membuat 2 roles:

   - `USER` - Role untuk user biasa
   - `ADMINISTRATOR` - Role untuk administrator

4. **Buka Prisma Studio** (opsional)
   ```bash
   npx prisma studio
   ```

## 🏃 Menjalankan Aplikasi

### Development Mode

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000` dengan auto-reload.

### Production Mode

```bash
npm start
```

### Available Scripts

- `npm run dev` - Jalankan development server dengan nodemon
- `npm start` - Jalankan production server
- `npm test` - Jalankan semua tests
- `npm run test:watch` - Jalankan tests dalam watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run seed` - Seed database dengan data default

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Coverage report akan tersedia di folder `coverage/`.

**Testing Requirements:**

- Minimum 80% code coverage untuk code baru
- Semua tests harus pass sebelum merge PR
- Setiap feature baru harus memiliki tests

Lihat [TESTING.md](./TESTING.md) untuk panduan lengkap menulis tests.

## 📁 Struktur Project

```
risk-register/
├── src/
│   ├── app/
│   │   ├── server.js          # Express app configuration
│   │   └── database.js        # Prisma client instance
│   ├── config/
│   │   └── constant.js        # Application constants
│   ├── controllers/
│   │   └── user.controller.js # User request handlers
│   ├── services/
│   │   └── user.service.js    # Business logic
│   ├── routers/
│   │   └── public.route.js    # Public API routes
│   ├── validators/
│   │   ├── validator.js       # Generic validation helper
│   │   └── user.validation.js # User validation schemas
│   ├── middlewares/
│   │   └── error.middleware.js # Global error handler
│   ├── errors/
│   │   ├── response.error.js   # Custom error class
│   │   └── validation.error.js # Validation error class
│   └── main.js                # Application entry point
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.js               # Database seeder
├── test/
│   └── user.registration.test.js # User tests
├── docs/                      # Additional documentation
├── .env.example              # Environment template
├── package.json              # Dependencies
├── babel.config.js           # Babel configuration
└── nodemon.json             # Nodemon configuration
```

## 📖 Dokumentasi Tambahan

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Panduan kontribusi dan commit conventions
- [TESTING.md](./TESTING.md) - Panduan testing lengkap
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow dan best practices

## 📝 License

ISC License - D311 House Builder

---

**Happy Coding! 🚀**
