# Panduan Kontribusi

Terima kasih telah berkontribusi pada project Risk Register! Dokumen ini berisi panduan untuk memastikan konsistensi dan kualitas code dalam project.

## 📋 Daftar Isi

- [Code of Conduct](#-code-of-conduct)
- [Git Workflow](#-git-workflow)
- [Branch Naming](#-branch-naming-conventions)
- [Commit Messages](#-commit-message-conventions)
- [Pull Request Process](#-pull-request-process)
- [Code Style Guidelines](#-code-style-guidelines)
- [Testing Requirements](#-testing-requirements)
- [Code Review Checklist](#-code-review-checklist)

## 📜 Code of Conduct

- Bersikap profesional dan menghargai sesama contributor
- Fokus pada code quality dan best practices
- Memberikan feedback yang konstruktif
- Menghormati keputusan team leader

## 🔄 Git Workflow

Gunakan **Git Flow** dengan membuat pull request untuk setiap perubahan code:

```
main (production)
  ↑
  └── feature/xxx-feature-name
  └── bugfix/xxx-bug-description
  └── hotfix/xxx-critical-fix
```

### Alur Kerja:

1. **Pull latest** dari `main`

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Buat branch baru** sesuai konvensi

   ```bash
   git checkout -b feature/123-user-login
   ```

3. **Develop & commit** dengan commit message yang proper

   ```bash
   git add .
   git commit -m "feat(auth): add user login endpoint"
   ```

4. **Push ke remote**

   ```bash
   git push origin feature/123-user-login
   ```

5. **Buat Pull Request** di GitHub/GitLab

6. **Code Review** dari minimal 1 team member

7. **Merge** setelah approval

## 🌿 Branch Naming Conventions

Format: `<type>/<issue-number>-<short-description>`

### Branch Types:

| Type        | Keterangan                 | Contoh                           |
| ----------- | -------------------------- | -------------------------------- |
| `feature/`  | Feature baru               | `feature/123-user-login`         |
| `bugfix/`   | Bug fix                    | `bugfix/456-password-validation` |
| `hotfix/`   | Critical fix di production | `hotfix/789-security-patch`      |
| `docs/`     | Dokumentasi only           | `docs/update-readme`             |
| `refactor/` | Code refactoring           | `refactor/123-cleanup-service`   |
| `test/`     | Menambah/update tests      | `test/456-user-controller`       |

### Rules:

- Gunakan **lowercase**
- Description harus **jelas dan singkat** (max 50 chars)
- Gunakan **bahasa Inggris** untuk description

### Contoh Branch Names:

✅ **GOOD:**

```
feature/123-user-registration
bugfix/456-email-validation-error
hotfix/789-sql-injection-fix
docs/api-documentation
```

❌ **BAD:**

```
new-feature          # Tidak ada type dan terlalu umum
FEATURE/123         # Tidak lowercase
feature/fix_bug     # Menggunakan underscore
feature-123         # Format salah (harus ada /)
```

## 💬 Commit Message Conventions

Kami menggunakan **Conventional Commits** untuk commit messages yang konsisten dan mudah di-track.

### Format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Commit Types:

| Type       | Keterangan                         | Contoh                                    |
| ---------- | ---------------------------------- | ----------------------------------------- |
| `feat`     | Feature baru                       | `feat(auth): add user login endpoint`     |
| `fix`      | Bug fix                            | `fix(validation): correct email pattern`  |
| `docs`     | Perubahan dokumentasi              | `docs(readme): update installation steps` |
| `style`    | Format code (tidak mengubah logic) | `style(user): fix indentation`            |
| `refactor` | Refactoring code                   | `refactor(service): simplify user query`  |
| `test`     | Menambah atau update tests         | `test(auth): add login test cases`        |
| `chore`    | Maintenance tasks                  | `chore(deps): update dependencies`        |
| `perf`     | Performance improvement            | `perf(db): optimize user query`           |

### Scopes:

- `auth` - Authentication & authorization
- `user` - User management
- `role` - Role management
- `validation` - Input validation
- `database` - Database/Prisma
- `test` - Testing infrastructure
- `config` - Configuration

### Commit Message Rules:

1. Subject maksimal 72 karakter
2. Gunakan imperative mood (add, not added)
3. Lowercase
4. Tidak diakhiri titik

### Contoh:

✅ GOOD:

```
feat(auth): add user login endpoint
fix(validation): correct email validation regex
test(user): add tests for duplicate email handling
```

❌ BAD:

```
add login feature
Feat(auth): Add Login
feat(auth): added login endpoint
```

## 🔀 Pull Request Process

### 1. Sebelum Membuat PR:

✅ **Checklist:**

- [ ] Code sudah di-test secara lokal
- [ ] Semua tests pass (`npm test`)
- [ ] Code coverage memenuhi standar (min 80%)
- [ ] Tidak ada console.log atau debugging code
- [ ] Documentation sudah di-update jika perlu
- [ ] Commit messages sesuai konvensi

### 2. Pull Request Template:

**Title:** `<type>(<scope>): <description>`

**Description:**

```markdown
## 📝 Description

Jelaskan perubahan yang dilakukan.

## 🔗 Related Issue

Closes #123

## 🧪 Testing

- [ ] Unit tests added
- [ ] All tests passing

## ✅ Checklist

- [ ] Code follows style guidelines
- [ ] Documentation updated
```

### 3. Merge:

Setelah approval, gunakan **Squash and merge**.

## 🎨 Code Style Guidelines

### Naming Conventions:

| Type      | Convention | Example              |
| --------- | ---------- | -------------------- |
| Files     | kebab-case | `user-controller.js` |
| Variables | camelCase  | `userName`           |
| Functions | camelCase  | `getUserById()`      |
| Classes   | PascalCase | `ResponseError`      |
| Constants | UPPER_CASE | `APP_PORT`           |

### Import Organization:

```javascript
// 1. Node.js built-ins
import { resolve } from "path";

// 2. External dependencies
import express from "express";

// 3. Internal modules
import { prismaClient } from "../app/database.js";
```

### Error Handling:

```javascript
// ✅ GOOD
if (!user) {
  throw new ResponseError(404, "User tidak ditemukan");
}

// ❌ BAD
if (!user) {
  throw new Error("Error");
}
```

## 🧪 Testing Requirements

- ✅ Minimum 80% code coverage
- ✅ Semua tests harus pass
- ✅ Feature baru harus ada tests
- ✅ Bug fixes harus ada regression tests

Lihat [TESTING.md](./TESTING.md) untuk detail.

## ✅ Code Review Checklist

### For Authors:

- [ ] Code berfungsi sesuai requirement
- [ ] Tests passing
- [ ] No debug code
- [ ] Error handling implemented
- [ ] Documentation updated

### For Reviewers:

- [ ] Code logic benar
- [ ] Follows conventions
- [ ] Tests adequate
- [ ] No security issues
- [ ] Error handling complete

---

**Terima kasih! 🎉**
