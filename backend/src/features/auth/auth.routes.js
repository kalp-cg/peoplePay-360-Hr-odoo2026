const express = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/signup', (req, res, next) => authController.signup(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
