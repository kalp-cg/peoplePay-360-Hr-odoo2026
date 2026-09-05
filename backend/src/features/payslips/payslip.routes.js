const express = require('express');
const payslipController = require('./payslip.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'), (req, res, next) => payslipController.getAll(req, res, next));
router.get('/:id', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'), (req, res, next) => payslipController.getById(req, res, next));
router.get('/:id/pdf', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'), (req, res, next) => payslipController.getPDF(req, res, next));
router.post('/:id/send', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payslipController.sendEmail(req, res, next));
router.post('/bulk-send', authorize('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'), (req, res, next) => payslipController.bulkSend(req, res, next));

module.exports = router;
