const express = require('express');
const contractController = require('./contract.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'), (req, res, next) => contractController.getAll(req, res, next));
router.get('/lookup-applicable', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'), (req, res, next) => contractController.lookupApplicable(req, res, next));
router.get('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'), (req, res, next) => contractController.getById(req, res, next));
router.post('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => contractController.create(req, res, next));
router.put('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => contractController.update(req, res, next));

module.exports = router;
