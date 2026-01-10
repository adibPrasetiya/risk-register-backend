import Joi from "joi";

export const createRiskRegister = Joi.object({
  registerType: Joi.string()
    .valid("MANAJEMEN_RISIKO", "RISIKO_KEAMANAN")
    .required()
    .messages({
      "any.only": "registerType harus MANAJEMEN_RISIKO atau RISIKO_KEAMANAN",
      "any.required": "registerType wajib diisi",
      "string.empty": "registerType tidak boleh kosong",
    }),

  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "number.base": "year harus berupa angka",
    "number.integer": "year harus bilangan bulat",
    "number.min": "year minimal 2000",
    "number.max": "year maksimal 2100",
    "any.required": "year wajib diisi",
  }),

  period: Joi.string()
    .valid("TAHUNAN", "SEMESTER_1", "SEMESTER_2")
    .default("TAHUNAN")
    .messages({
      "any.only": "period harus TAHUNAN, SEMESTER_1, atau SEMESTER_2",
    }),

  unitKerja: Joi.string().max(255).required().messages({
    "string.empty": "unitKerja tidak boleh kosong",
    "string.max": "unitKerja maksimal 255 karakter",
    "any.required": "unitKerja wajib diisi",
  }),

  judul: Joi.string().max(255).required().messages({
    "string.empty": "judul tidak boleh kosong",
    "string.max": "judul maksimal 255 karakter",
    "any.required": "judul wajib diisi",
  }),

  konteks: Joi.string().allow("", null).optional(),
});

export const listRiskRegisterQuery = Joi.object({
  registerType: Joi.string()
    .valid("MANAJEMEN_RISIKO", "RISIKO_KEAMANAN")
    .optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
  period: Joi.string().valid("TAHUNAN", "SEMESTER_1", "SEMESTER_2").optional(),
  unitKerja: Joi.string().max(255).optional(),
});

export const createRisk = Joi.object({
  kategori: Joi.string()
    .valid("STRATEGIS", "OPERASIONAL", "KEUANGAN", "KEPATUHAN", "REPUTASI", "LAINNYA")
    .default("LAINNYA"),

  // Khusus RISIKO_KEAMANAN
  obyekPengamanan: Joi.string()
    .valid("PERSONEL", "TAMU", "ASET_FISIK", "INFORMASI")
    .allow(null)
    .optional(),

  jenisAncaman: Joi.string()
    .valid(
      "KRIMINALITAS",
      "TERORISME",
      "BENCANA_ALAM",
      "PERANG",
      "KONFLIK_SOSIAL",
      "INSTABILITAS_POLITIK",
      "PENYADAPAN",
      "PENGGALANGAN",
      "KEJAHATAN_SIBER",
      "LAINNYA"
    )
    .allow(null)
    .optional(),

  tujuan: Joi.string().allow("", null).optional(),
  kegiatan: Joi.string().allow("", null).optional(),

  pernyataanRisiko: Joi.string().required().messages({
    "string.empty": "pernyataanRisiko tidak boleh kosong",
    "any.required": "pernyataanRisiko wajib diisi",
  }),

  penyebab: Joi.string().allow("", null).optional(),
  dampak: Joi.string().allow("", null).optional(),
  kontrolEksisting: Joi.string().allow("", null).optional(),

  likelihood: Joi.number().integer().required().messages({
    "number.base": "likelihood harus berupa angka",
    "number.integer": "likelihood harus bilangan bulat",
    "any.required": "likelihood wajib diisi",
  }),

  impact: Joi.number().integer().required().messages({
    "number.base": "impact harus berupa angka",
    "number.integer": "impact harus bilangan bulat",
    "any.required": "impact wajib diisi",
  }),

  ownerId: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
});

export const updateRisk = Joi.object({
  kategori: Joi.string().valid(
    "STRATEGIS",
    "OPERASIONAL",
    "KEUANGAN",
    "KEPATUHAN",
    "REPUTASI",
    "LAINNYA"
  ).optional(),

  obyekPengamanan: Joi.string()
    .valid("PERSONEL", "TAMU", "ASET_FISIK", "INFORMASI")
    .allow(null)
    .optional(),

  jenisAncaman: Joi.string()
    .valid(
      "KRIMINALITAS",
      "TERORISME",
      "BENCANA_ALAM",
      "PERANG",
      "KONFLIK_SOSIAL",
      "INSTABILITAS_POLITIK",
      "PENYADAPAN",
      "PENGGALANGAN",
      "KEJAHATAN_SIBER",
      "LAINNYA"
    )
    .allow(null)
    .optional(),

  tujuan: Joi.string().allow("", null).optional(),
  kegiatan: Joi.string().allow("", null).optional(),
  pernyataanRisiko: Joi.string().optional(),
  penyebab: Joi.string().allow("", null).optional(),
  dampak: Joi.string().allow("", null).optional(),
  kontrolEksisting: Joi.string().allow("", null).optional(),

  likelihood: Joi.number().integer().optional(),
  impact: Joi.number().integer().optional(),
  ownerId: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
});

export const createRiskTreatment = Joi.object({
  strategi: Joi.string()
    .valid("HINDARI", "KURANGI", "PINDAHKAN", "TERIMA")
    .required()
    .messages({
      "any.only": "strategi harus HINDARI, KURANGI, PINDAHKAN, atau TERIMA",
      "any.required": "strategi wajib diisi",
    }),

  uraian: Joi.string().required().messages({
    "string.empty": "uraian tidak boleh kosong",
    "any.required": "uraian wajib diisi",
  }),

  picId: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),

  targetMulai: Joi.date().iso().allow(null).optional(),
  targetSelesai: Joi.date().iso().allow(null).optional(),

  status: Joi.string()
    .valid("DIRENCANAKAN", "BERJALAN", "SELESAI", "DITUNDA", "DIBATALKAN")
    .default("DIRENCANAKAN"),

  sumberDaya: Joi.string().allow("", null).optional(),
});

export const createRiskMonitoringLog = Joi.object({
  catatan: Joi.string().allow("", null).optional(),
  status: Joi.string().max(50).default("OPEN"),

  residualLikelihood: Joi.number().integer().allow(null).optional(),
  residualImpact: Joi.number().integer().allow(null).optional(),
});

export const createRiskGovernanceAssignment = Joi.object({
  userId: Joi.string().guid({ version: "uuidv4" }).required().messages({
    "any.required": "userId wajib diisi",
  }),
  role: Joi.string()
    .valid(
      "KOMITE_MANAJEMEN_RISIKO",
      "PEMILIK_RISIKO",
      "PENGAWAS_KEPATUHAN_MANAJEMEN_RISIKO",
      "KOMITE_PENGAMANAN",
      "TIM_PENGAMANAN"
    )
    .required()
    .messages({
      "any.only": "role tidak valid",
      "any.required": "role wajib diisi",
    }),
  unitKerja: Joi.string().max(255).allow("", null).optional(),
});
