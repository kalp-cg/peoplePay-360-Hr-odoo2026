const express = require('express');
const scheduleController = require('./schedule.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res, next) => scheduleController.getAll(req, res, next));
router.get('/:id', (req, res, next) => scheduleController.getById(req, res, next));
router.post('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => scheduleController.create(req, res, next));
router.put('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), (req, res, next) => scheduleController.update(req, res, next));

module.exports = router;
