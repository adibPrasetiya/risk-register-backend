import { prismaClient } from "../app/database.js";
import { ResponseError } from "../errors/response.error.js";
import { validate } from "../validators/validator.js";
import {
  createRiskRegister,
  listRiskRegisterQuery,
  createRisk,
  updateRisk,
  createRiskTreatment,
  createRiskMonitoringLog,
  createRiskGovernanceAssignment,
} from "../validators/risk.validation.js";
import { REGISTER_TYPE, computeRiskScoreAndLevel } from "../utils/risk.util.js";

const ensureRegisterExists = async (registerId) => {
  const register = await prismaClient.riskRegister.findUnique({
    where: { id: registerId },
  });

  if (!register) {
    throw new ResponseError(404, "RiskRegister tidak ditemukan.");
  }

  return register;
};

const ensureRiskExists = async (riskId) => {
  const risk = await prismaClient.risk.findUnique({
    where: { id: riskId },
    include: {
      register: true,
    },
  });

  if (!risk) {
    throw new ResponseError(404, "Risiko tidak ditemukan.");
  }

  return risk;
};

const createRegister = async (userId, reqBody) => {
  const data = validate(createRiskRegister, reqBody);

  const register = await prismaClient.riskRegister.create({
    data: {
      ...data,
      createdById: userId,
    },
  });

  return {
    message: "RiskRegister berhasil dibuat.",
    data: register,
  };
};

const listRegisters = async (reqQuery) => {
  const query = validate(listRiskRegisterQuery, reqQuery);

  const registers = await prismaClient.riskRegister.findMany({
    where: {
      ...(query.registerType ? { registerType: query.registerType } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.period ? { period: query.period } : {}),
      ...(query.unitKerja ? { unitKerja: query.unitKerja } : {}),
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  return {
    message: "OK",
    data: registers,
  };
};

const getRegister = async (registerId) => {
  const register = await prismaClient.riskRegister.findUnique({
    where: { id: registerId },
    include: {
      risks: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          treatments: { orderBy: [{ createdAt: "desc" }] },
          monitoringLogs: { orderBy: [{ createdAt: "desc" }] },
          owner: { select: { id: true, username: true, email: true } },
        },
      },
      createdBy: { select: { id: true, username: true, email: true } },
    },
  });

  if (!register) throw new ResponseError(404, "RiskRegister tidak ditemukan.");

  return {
    message: "OK",
    data: register,
  };
};

const createRiskItem = async (userId, registerId, reqBody) => {
  const register = await ensureRegisterExists(registerId);
  const data = validate(createRisk, reqBody);

  // Requirement khusus RISIKO_KEAMANAN
  if (register.registerType === REGISTER_TYPE.RISIKO_KEAMANAN) {
    if (!data.obyekPengamanan) {
      throw new ResponseError(
        400,
        "obyekPengamanan wajib diisi untuk registerType RISIKO_KEAMANAN."
      );
    }
    if (!data.jenisAncaman) {
      throw new ResponseError(
        400,
        "jenisAncaman wajib diisi untuk registerType RISIKO_KEAMANAN."
      );
    }
  }

  const { score, level } = computeRiskScoreAndLevel(
    register.registerType,
    data.likelihood,
    data.impact
  );

  const risk = await prismaClient.risk.create({
    data: {
      ...data,
      registerId,
      score,
      level,
      // default owner: jika tidak diisi, set ke pembuat
      ownerId: data.ownerId || userId,
    },
  });

  return {
    message: "Risiko berhasil ditambahkan.",
    data: risk,
  };
};

const updateRiskItem = async (riskId, reqBody) => {
  const existing = await ensureRiskExists(riskId);
  const data = validate(updateRisk, reqBody);

  const likelihood = data.likelihood ?? existing.likelihood;
  const impact = data.impact ?? existing.impact;

  const { score, level } = computeRiskScoreAndLevel(
    existing.register.registerType,
    likelihood,
    impact
  );

  const updated = await prismaClient.risk.update({
    where: { id: riskId },
    data: {
      ...data,
      likelihood,
      impact,
      score,
      level,
    },
  });

  return {
    message: "Risiko berhasil diperbarui.",
    data: updated,
  };
};

const addTreatment = async (riskId, reqBody) => {
  await ensureRiskExists(riskId);
  const data = validate(createRiskTreatment, reqBody);

  const treatment = await prismaClient.riskTreatment.create({
    data: {
      ...data,
      riskId,
      // Prisma akan cast date otomatis jika string ISO dikirim
    },
  });

  return {
    message: "Rencana penanganan Risiko berhasil ditambahkan.",
    data: treatment,
  };
};

const addMonitoringLog = async (riskId, reqBody) => {
  const risk = await ensureRiskExists(riskId);
  const data = validate(createRiskMonitoringLog, reqBody);

  let residual = {
    residualLikelihood: null,
    residualImpact: null,
    residualScore: null,
    residualLevel: null,
  };

  if (
    data.residualLikelihood !== undefined ||
    data.residualImpact !== undefined
  ) {
    const rl =
      data.residualLikelihood !== undefined
        ? data.residualLikelihood
        : risk.likelihood;
    const ri =
      data.residualImpact !== undefined ? data.residualImpact : risk.impact;

    const { score, level } = computeRiskScoreAndLevel(
      risk.register.registerType,
      rl,
      ri
    );

    residual = {
      residualLikelihood: rl,
      residualImpact: ri,
      residualScore: score,
      residualLevel: level,
    };
  }

  const log = await prismaClient.riskMonitoringLog.create({
    data: {
      riskId,
      catatan: data.catatan,
      status: data.status,
      ...residual,
    },
  });

  return {
    message: "Log monitoring berhasil ditambahkan.",
    data: log,
  };
};

const assignGovernance = async (reqBody) => {
  const data = validate(createRiskGovernanceAssignment, reqBody);

  try {
    const assignment = await prismaClient.riskGovernanceAssignment.create({
      data: {
        userId: data.userId,
        role: data.role,
        unitKerja: data.unitKerja || null,
      },
    });

    return { message: "Penugasan governance berhasil dibuat.", data: assignment };
  } catch (e) {
    // Unique constraint
    if (e?.code === "P2002") {
      throw new ResponseError(409, "Penugasan governance sudah ada.");
    }
    throw e;
  }
};

const listGovernance = async (reqQuery) => {
  const role = reqQuery?.role;
  const unitKerja = reqQuery?.unitKerja;

  const where = {
    ...(role ? { role } : {}),
    ...(unitKerja ? { unitKerja } : {}),
  };

  const items = await prismaClient.riskGovernanceAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return { message: "OK", data: items };
};

export default {
  createRegister,
  listRegisters,
  getRegister,
  createRiskItem,
  updateRiskItem,
  addTreatment,
  addMonitoringLog,
  assignGovernance,
  listGovernance,
};
