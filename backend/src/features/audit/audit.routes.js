const express = require('express');
const auditService = require('./audit.service');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { sendSuccess } = require('../../utils/response');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), async (req, res, next) => {
  try {
    const logs = await auditService.getLogs(req.query);
    return sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
