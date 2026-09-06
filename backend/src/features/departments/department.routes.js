const express = require('express');
const departmentService = require('./department.service');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { atLeast } = require('../../middleware/roles');
const { sendSuccess } = require('../../utils/response');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const depts = await departmentService.getAll();
    return sendSuccess(res, depts);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize(...atLeast('HR_MANAGER')), async (req, res, next) => {
  try {
    const created = await departmentService.create(req.body);
    return sendSuccess(res, created, 201, 'Department created.');
  } catch (err) {
    next(err);
  }
});

router.get('/positions', async (req, res, next) => {
  try {
    const positions = await departmentService.getJobPositions(req.query.departmentId);
    return sendSuccess(res, positions);
  } catch (err) {
    next(err);
  }
});

router.post('/positions', authorize(...atLeast('HR_MANAGER')), async (req, res, next) => {
  try {
    const created = await departmentService.createJobPosition(req.body);
    return sendSuccess(res, created, 201, 'Job position created.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
