const express = require('express');
const timeOffController = require('./timeoff.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { atLeast } = require('../../middleware/roles');

const router = express.Router();

router.use(authenticate);

// Types
router.get('/types', (req, res, next) => timeOffController.getTypes(req, res, next));
router.post('/types', authorize(...atLeast('HR_MANAGER')), (req, res, next) => timeOffController.createType(req, res, next));

// Allocations
router.get('/allocations', (req, res, next) => timeOffController.getAllocations(req, res, next));
router.post('/allocations', authorize(...atLeast('HR_MANAGER')), (req, res, next) => timeOffController.createAllocation(req, res, next));

// Requests
router.get('/requests', (req, res, next) => timeOffController.getRequests(req, res, next));
router.post('/requests', (req, res, next) => timeOffController.submitRequest(req, res, next));
router.patch('/requests/:id/approve', authorize(...atLeast('HR_MANAGER')), (req, res, next) => timeOffController.approveRequest(req, res, next));
router.patch('/requests/:id/reject', authorize(...atLeast('HR_MANAGER')), (req, res, next) => timeOffController.rejectRequest(req, res, next));

module.exports = router;
