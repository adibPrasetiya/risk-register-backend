import riskService from "../services/risk.service.js";

const createRegister = async (req, res, next) => {
  try {
    const result = await riskService.createRegister(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

const listRegisters = async (req, res, next) => {
  try {
    const result = await riskService.listRegisters(req.query);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

const getRegister = async (req, res, next) => {
  try {
    const result = await riskService.getRegister(req.params.registerId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

const createRisk = async (req, res, next) => {
  try {
    const result = await riskService.createRiskItem(
      req.user.id,
      req.params.registerId,
      req.body
    );
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

const updateRisk = async (req, res, next) => {
  try {
    const result = await riskService.updateRiskItem(req.params.riskId, req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

const addTreatment = async (req, res, next) => {
  try {
    const result = await riskService.addTreatment(req.params.riskId, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

const addMonitoringLog = async (req, res, next) => {
  try {
    const result = await riskService.addMonitoringLog(
      req.params.riskId,
      req.body
    );
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

const assignGovernance = async (req, res, next) => {
  try {
    const result = await riskService.assignGovernance(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

const listGovernance = async (req, res, next) => {
  try {
    const result = await riskService.listGovernance(req.query);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export default {
  createRegister,
  listRegisters,
  getRegister,
  createRisk,
  updateRisk,
  addTreatment,
  addMonitoringLog,
  assignGovernance,
  listGovernance,
};
