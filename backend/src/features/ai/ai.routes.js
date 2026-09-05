const express = require('express');
const aiController = require('./ai.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/explain/:employeeId', (req, res, next) => aiController.explainSalaryChange(req, res, next));
router.get('/anomalies', (req, res, next) => aiController.detectAnomalies(req, res, next));
router.post('/query', (req, res, next) => aiController.queryNL(req, res, next));

module.exports = router;
