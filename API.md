# API Documentation

## Overview

This API uses a **RESTful** design and returns responses in **JSON** format.

### Authentication

- **Authentication Scheme**: Opaque Token (Bearer Token).
- **Header**: `Authorization: Bearer <access_token>`
- **Session Management**: Access tokens are stored in the database and have an expiration time. Refresh tokens are stored in HTTP-only cookies.

### Response Format

**Success (2xx):**
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

**Error (4xx, 5xx):**
```json
{
  "errors": "Error description"
}
```

---

## 👤 Public Endpoints

### 1. Register User
Create a new user account. Accounts are inactive (`is_active: false`) and unverified (`is_verified: false`) by default, requiring admin approval.

- **URL**: `/users` (or `/users/register`)
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "StrongPassword123!",
    "fullName": "John Doe"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Pendaftaran berhasil. Menunggu verifikasi admin.",
    "data": {
      "user": {
        "id": "uuid...",
        "username": "johndoe",
        "email": "john@example.com",
        "is_active": false,
        "is_verified": false
      }
    }
  }
  ```

### 2. Login
Authenticate a user and create a session.

- **URL**: `/users/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "johndoe", // or email
    "password": "StrongPassword123!",
    "totpCode": "123456" // Optional: if 2FA is enabled
  }
  ```
- **Response (200 OK)**:
  - **Headers**: Set-Cookie `refreshToken=...; HttpOnly`
  - **Body**:
    ```json
    {
      "message": "Login berhasil",
      "data": {
        "user": { ... },
        "accessToken": "hex_string_token...",
        "nextAction": "DASHBOARD" // or "MUST_CHANGE_PASSWORD", "PROFILE_REQUIRED"
      }
    }
    ```

### 3. Request Password Reset
Initiate a password reset process. Requires Admin validation to complete.

- **URL**: `/users/reset-password/request`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "identifier": "john@example.com"
  }
  ```

---

## 🔐 Protected Endpoints (User)

Requires `Authorization: Bearer <token>` header.

### 1. Logout
Invalidate the current session.

- **URL**: `/users/logout`
- **Method**: `DELETE`

### 2. Update Password
Change current user's password. Requires current password verification. Invalidates current session.

- **URL**: `/users/password`
- **Method**: `PATCH`
- **Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewStrongPassword123!"
  }
  ```

### 3. Update Profile
Update user profile information.

- **URL**: `/users/current`
- **Method**: `PATCH`
- **Body**:
  ```json
  {
    "fullName": "John Updated",
    "bio": "Software Engineer",
    "email": "newemail@example.com"
  }
  ```

### 4. 2FA Management

#### Generate Secret
- **URL**: `/users/2fa/generate`
- **Method**: `POST`
- **Response**: Returns `secret` and `qrCode` (Data URL).

#### Enable 2FA
- **URL**: `/users/2fa/enable`
- **Method**: `POST`
- **Body**: `{"token": "123456"}` (OTP Code)

#### Disable 2FA
- **URL**: `/users/2fa/disable`
- **Method**: `POST`

---

## 🛡️ Risk Management (Permenlu 10/2017 & 8/2019)

### 1. List Risk Registers
Get a list of risk registers with filtering options.

- **URL**: `/risk-registers`
- **Method**: `GET`
- **Query Params**:
  - `year` (e.g., 2026)
  - `period` (`TAHUNAN`, `SEMESTER_1`, `SEMESTER_2`)
  - `registerType` (`MANAJEMEN_RISIKO`, `RISIKO_KEAMANAN`)
  - `unitKerja`

### 2. Create Risk Register
Create a header for a new risk assessment document.

- **URL**: `/risk-registers`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "registerType": "MANAJEMEN_RISIKO",
    "year": 2026,
    "period": "TAHUNAN",
    "unitKerja": "IT Division",
    "judul": "Risk Register 2026"
  }
  ```

### 3. Get Risk Register Detail
Get full details including all risk items, treatments, and logs.

- **URL**: `/risk-registers/:registerId`
- **Method**: `GET`

### 4. Create Risk Item
Add a risk item to a register. Automatically calculates Risk Score and Level.

- **URL**: `/risk-registers/:registerId/risks`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "pernyataanRisiko": "Server Downtime",
    "penyebab": "Power failure",
    "dampak": "Service unavailable",
    "likelihood": 3,
    "impact": 5,
    "kategori": "OPERASIONAL",
    // For RISIKO_KEAMANAN only:
    "obyekPengamanan": "ASET_FISIK",
    "jenisAncaman": "BENCANA_ALAM"
  }
  ```

### 5. Update Risk Item
Update likelihood, impact, or other details. Recalculates Score/Level automatically.

- **URL**: `/risks/:riskId`
- **Method**: `PATCH`

### 6. Add Risk Treatment
Add a mitigation plan (`RiskTreatment`) to a risk item.

- **URL**: `/risks/:riskId/treatments`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "strategi": "KURANGI",
    "uraian": "Install UPS",
    "targetSelesai": "2026-06-01"
  }
  ```

### 7. Add Monitoring Log
Log monitoring activities and update residual risk scores.

- **URL**: `/risks/:riskId/monitoring`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "catatan": "UPS Installed and tested.",
    "status": "SELESAI",
    "residualLikelihood": 1,
    "residualImpact": 5
  }
  ```

---

## 👑 Admin Endpoints

Requires `ADMIN` role.

### 1. Verify User
Activate and verify a newly registered user.

- **URL**: `/admin/users/:userId/verify`
- **Method**: `PATCH`
- **Body**:
  ```json
  {
    "is_active": true,
    "is_verified": true
  }
  ```

### 2. List Password Reset Requests
View pending password reset requests.

- **URL**: `/admin/password-reset/requests`
- **Method**: `GET`
- **Query Params**: `status` (PENDING, COMPLETED)

### 3. Complete Password Reset
Manually set a new password for a user request.

- **URL**: `/admin/password-reset/complete`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "requestId": "request-uuid...",
    "adminCurrentPassword": "AdminPassword123!",
    "newPassword": "UserNewPassword123!"
  }
  ```

### 4. Assign Governance
Assign users to specific risk governance roles (e.g., Risk Owner, Committee).

- **URL**: `/risk-governance`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "userId": "user-uuid...",
    "role": "PEMILIK_RISIKO",
    "unitKerja": "Finance"
  }
  ```
