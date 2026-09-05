const express = require('express');
const employeeController = require('./employee.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res, next) => employeeController.getAll(req, res, next));

// Employee Profile Change Requests (HR Approval Workflow)
router.get('/profile-change-requests', (req, res, next) => employeeController.getProfileRequests(req, res, next));
router.post('/profile-change-requests', (req, res, next) => employeeController.createProfileRequest(req, res, next));
router.patch('/profile-change-requests/:requestId/approve', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => employeeController.approveProfileRequest(req, res, next));
router.patch('/profile-change-requests/:requestId/reject', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => employeeController.rejectProfileRequest(req, res, next));

router.get('/:id', (req, res, next) => employeeController.getById(req, res, next));
router.post('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => employeeController.create(req, res, next));
router.put('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => employeeController.update(req, res, next));
router.delete('/:id', authorize('ADMIN', 'HR_PAYROLL_MANAGER'), (req, res, next) => employeeController.delete(req, res, next));

module.exports = router;
