const express = require('express');
const contractController = require('./contract.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');
const { atLeast } = require('../../middleware/roles');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(...atLeast('HR_MANAGER')), (req, res, next) => contractController.getAll(req, res, next));
router.get('/lookup-applicable', authorize(...atLeast('HR_MANAGER')), (req, res, next) => contractController.lookupApplicable(req, res, next));
router.get('/:id', authorize(...atLeast('HR_MANAGER')), (req, res, next) => contractController.getById(req, res, next));
router.post('/', authorize(...atLeast('HR_MANAGER')), (req, res, next) => contractController.create(req, res, next));
router.put('/:id', authorize(...atLeast('HR_MANAGER')), (req, res, next) => contractController.update(req, res, next));

module.exports = router;
