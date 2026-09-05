const express = require('express');
const salaryController = require('./salary.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

// Structures
router.get('/structures', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => salaryController.getStructures(req, res, next));
router.get('/structures/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => salaryController.getStructureById(req, res, next));
router.post('/structures', authorize('ADMIN', 'HR_PAYROLL_MANAGER'), (req, res, next) => salaryController.createStructure(req, res, next));
router.put('/structures/:id', authorize('ADMIN', 'HR_PAYROLL_MANAGER'), (req, res, next) => salaryController.updateStructure(req, res, next));

// Rules
router.get('/rules', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => salaryController.getRules(req, res, next));
router.post('/rules', authorize('ADMIN', 'HR_PAYROLL_MANAGER'), (req, res, next) => salaryController.createRule(req, res, next));
router.put('/rules/:id', authorize('ADMIN', 'HR_PAYROLL_MANAGER'), (req, res, next) => salaryController.updateRule(req, res, next));

module.exports = router;
