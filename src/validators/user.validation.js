import Joi from 'joi';

const passwordPolicy = Joi.string()
  .min(8)
  .max(255)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]+$/)
  .messages({
    'string.min': 'Password minimal 8 karakter',
    'string.max': 'Password maksimal 255 karakter',
    'string.pattern.base':
      'Password harus mengandung minimal 1 huruf kecil, 1 huruf kapital, 1 angka, dan 1 karakter spesial (@$!%*?&#^()_-+=)',
  });

export const createNewUser = Joi.object({
  username: Joi.string()
    .min(3)
    .max(255)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Username tidak boleh kosong',
      'string.min': 'Username minimal 3 karakter',
      'string.max': 'Username maksimal 255 karakter',
      'string.pattern.base':
        'Username hanya boleh berisi huruf, angka, dan underscore',
      'any.required': 'Username wajib diisi',
    }),

  // Mengikuti skema proses bisnis: fullName (tetap support full_name untuk kompatibilitas)
  fullName: Joi.string().min(2).max(255).optional().messages({
    'string.empty': 'Nama tidak boleh kosong',
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 255 karakter',
  }),
  full_name: Joi.string().min(2).max(255).optional().messages({
    'string.empty': 'Nama tidak boleh kosong',
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 255 karakter',
  }),

  email: Joi.string().email().max(255).required().messages({
    'string.empty': 'Email tidak boleh kosong',
    'string.email': 'Format email tidak valid',
    'string.max': 'Email maksimal 255 karakter',
    'any.required': 'Email wajib diisi',
  }),

  password: passwordPolicy.required().messages({
    'string.empty': 'Password tidak boleh kosong',
    'any.required': 'Password wajib diisi',
  }),
}).or('fullName', 'full_name');

export const loginUser = Joi.object({
  // identifier: username/email (field tetap "username" untuk kompatibilitas existing)
  username: Joi.string().required().messages({
    'string.empty': 'Username atau Email tidak boleh kosong',
    'any.required': 'Username atau Email wajib diisi',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password tidak boleh kosong',
    'any.required': 'Password wajib diisi',
  }),
  totpCode: Joi.string().length(6).optional().messages({
    'string.length': 'Kode TOTP harus 6 digit',
  }),
});

export const updateUserProfile = Joi.object({
  fullName: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Nama minimal 2 karakter',
    'string.max': 'Nama maksimal 255 karakter',
  }),
  bio: Joi.string().max(1000).optional().allow(''),
  avatar: Joi.string().uri().max(255).optional().allow(''),
  email: Joi.string().email().max(255).optional().messages({
    'string.email': 'Format email tidak valid',
    'string.max': 'Email maksimal 255 karakter',
  }),
});

export const updatePassword = Joi.object({
  // Mengikuti skema proses bisnis: currentPassword + newPassword
  currentPassword: Joi.string().optional(),
  // kompatibilitas endpoint lama
  oldPassword: Joi.string().optional(),
  newPassword: passwordPolicy.required(),
}).or('currentPassword', 'oldPassword');

export const verifyTotp = Joi.object({
  token: Joi.string().length(6).required().messages({
    'string.length': 'Kode TOTP harus 6 digit',
    'any.required': 'Token wajib diisi',
  }),
});

export const resetPasswordRequest = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Username atau Email wajib diisi',
  }),
});

export const adminCompleteResetPassword = Joi.object({
  requestId: Joi.string().required().messages({
    'any.required': 'requestId wajib diisi',
  }),
  newPassword: passwordPolicy.required(),
  adminCurrentPassword: Joi.string().required().messages({
    'any.required': 'Password admin wajib diisi',
  }),
});

export const adminVerifyUser = Joi.object({
  is_active: Joi.boolean().optional(),
  is_verified: Joi.boolean().optional(),
}).or('is_active', 'is_verified');

// Backward compatible validator (dipakai endpoint lama)
export const adminResetPassword = resetPasswordRequest;
