import { ResponseError } from "../errors/response.error.js";

/**
 * Utility perhitungan skor & level Risiko sesuai:
 * - Permenlu No. 10 Tahun 2017 (Manajemen Risiko): likelihood 1-3, impact 1-5, skor 1-15 (likelihood x impact)
 *   Status: 1-2 RENDAH, 3-9 SEDANG, 10-15 TINGGI
 * - Permenlu No. 8 Tahun 2019 (Manajemen Risiko Pengamanan): likelihood 1-5, impact 1-5, skor 1-25 (likelihood x impact)
 *   Level: RENDAH, SEDANG, TINGGI, EKSTREM (mengikuti praktik matriks 5x5)
 */

export const REGISTER_TYPE = {
  MANAJEMEN_RISIKO: "MANAJEMEN_RISIKO",
  RISIKO_KEAMANAN: "RISIKO_KEAMANAN",
};

const assertIntInRange = (value, min, max, label) => {
  if (!Number.isInteger(value)) {
    throw new ResponseError(400, `${label} harus berupa bilangan bulat.`);
  }
  if (value < min || value > max) {
    throw new ResponseError(400, `${label} harus berada pada rentang ${min}-${max}.`);
  }
};

export const computeRiskScoreAndLevel = (registerType, likelihood, impact) => {
  if (!registerType) {
    throw new ResponseError(400, "registerType wajib diisi.");
  }

  if (registerType === REGISTER_TYPE.MANAJEMEN_RISIKO) {
    assertIntInRange(likelihood, 1, 3, "Likelihood");
    assertIntInRange(impact, 1, 5, "Impact");

    const score = likelihood * impact;

    // Permenlu 10/2017 Lampiran - Tingkat status Risiko:
    // 1-2 rendah, 3-9 sedang, 10-15 tinggi
    let level = "SEDANG";
    if (score <= 2) level = "RENDAH";
    else if (score <= 9) level = "SEDANG";
    else level = "TINGGI";

    return { score, level };
  }

  if (registerType === REGISTER_TYPE.RISIKO_KEAMANAN) {
    assertIntInRange(likelihood, 1, 5, "Likelihood");
    assertIntInRange(impact, 1, 5, "Impact");

    const score = likelihood * impact;

    // Permenlu 8/2019 menggunakan matriks 5x5 dengan 4 level (rendah/sedang/tinggi/ekstrem).
    // Mapping skor: 1-4 rendah, 5-9 sedang, 10-14 tinggi, 15-25 ekstrem
    let level = "SEDANG";
    if (score <= 4) level = "RENDAH";
    else if (score <= 9) level = "SEDANG";
    else if (score <= 14) level = "TINGGI";
    else level = "EKSTREM";

    return { score, level };
  }

  throw new ResponseError(400, `registerType tidak dikenali: ${registerType}`);
};

export default {
  REGISTER_TYPE,
  computeRiskScoreAndLevel,
};
