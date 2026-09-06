const express = require('express');
const salaryController = require('./salary.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { atLeast } = require('../../middleware/roles');

const router = express.Router();

router.use(authenticate);

// Structures
router.get('/structures', authorize(...atLeast('HR_MANAGER')), (req, res, next) => salaryController.getStructures(req, res, next));
router.get('/structures/:id', authorize(...atLeast('HR_MANAGER')), (req, res, next) => salaryController.getStructureById(req, res, next));
router.post('/structures', authorize(...atLeast('HR_PAYROLL_MANAGER')), (req, res, next) => salaryController.createStructure(req, res, next));
router.put('/structures/:id', authorize(...atLeast('HR_PAYROLL_MANAGER')), (req, res, next) => salaryController.updateStructure(req, res, next));

// Rules
router.get('/rules', authorize(...atLeast('HR_PAYROLL_USER')), (req, res, next) => salaryController.getRules(req, res, next));
router.post('/rules', authorize(...atLeast('HR_PAYROLL_MANAGER')), (req, res, next) => salaryController.createRule(req, res, next));
router.put('/rules/:id', authorize(...atLeast('HR_PAYROLL_MANAGER')), (req, res, next) => salaryController.updateRule(req, res, next));

module.exports = router;
