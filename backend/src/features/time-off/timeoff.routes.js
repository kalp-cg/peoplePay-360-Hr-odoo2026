const express = require('express');
const timeOffController = require('./timeoff.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

// Types
router.get('/types', (req, res, next) => timeOffController.getTypes(req, res, next));
router.post('/types', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => timeOffController.createType(req, res, next));

// Allocations
router.get('/allocations', (req, res, next) => timeOffController.getAllocations(req, res, next));
router.post('/allocations', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => timeOffController.createAllocation(req, res, next));

// Requests
router.get('/requests', (req, res, next) => timeOffController.getRequests(req, res, next));
router.post('/requests', (req, res, next) => timeOffController.submitRequest(req, res, next));
router.patch('/requests/:id/approve', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => timeOffController.approveRequest(req, res, next));
router.patch('/requests/:id/reject', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => timeOffController.rejectRequest(req, res, next));

module.exports = router;
