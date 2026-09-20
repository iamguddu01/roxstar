const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.loginOrRegister);
router.get('/:id', userController.getUser);

module.exports = router;
