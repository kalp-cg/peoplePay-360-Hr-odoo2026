const express = require('express');
const userController = require('./user.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// Must be before /:id to avoid route conflict
router.get('/provision-options', (req, res, next) => userController.getProvisionOptions(req, res, next));

router.get('/', (req, res, next) => userController.getAll(req, res, next));
router.get('/:id', (req, res, next) => userController.getById(req, res, next));
router.post('/', (req, res, next) => userController.create(req, res, next));
router.put('/:id', (req, res, next) => userController.update(req, res, next));
router.delete('/:id', (req, res, next) => userController.delete(req, res, next));

module.exports = router;
