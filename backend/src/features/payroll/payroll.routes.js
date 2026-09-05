const express = require('express');
const payrollController = require('./payroll.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.getAll(req, res, next));
router.get('/eligible-employees', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.getEligibleEmployees(req, res, next));
router.get('/:id', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.getById(req, res, next));
router.post('/', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.create(req, res, next));
router.post('/:id/compute', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.compute(req, res, next));
router.post('/:id/submit', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.submitForReview(req, res, next));
router.post('/:id/validate', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.validate(req, res, next));
router.post('/:id/mark-paid', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payrollController.markPaid(req, res, next));

module.exports = router;
