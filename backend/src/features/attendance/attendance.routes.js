const express = require('express');
const attendanceController = require('./attendance.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { atLeast } = require('../../middleware/roles');

const router = express.Router();

router.use(authenticate);

router.get('/current-status', (req, res, next) => attendanceController.getCurrentStatus(req, res, next));
router.post('/quick-toggle', (req, res, next) => attendanceController.quickToggle(req, res, next));
router.get('/policy', (req, res, next) => attendanceController.getPolicy(req, res, next));
router.put('/policy', authorize('ADMIN'), (req, res, next) => attendanceController.updatePolicy(req, res, next));
router.get('/', (req, res, next) => attendanceController.getAll(req, res, next));
router.post('/', (req, res, next) => attendanceController.record(req, res, next));
router.put('/:id', authorize(...atLeast('HR_MANAGER')), (req, res, next) => attendanceController.correct(req, res, next));

module.exports = router;
