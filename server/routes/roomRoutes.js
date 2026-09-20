const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Room endpoints
router.post('/', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.get('/', roomController.getPublicRooms);
router.get('/rewards/config', roomController.getRewardsConfig);

// Specific room endpoints
router.get('/:code', roomController.getRoomDetails);
router.get('/:code/players', roomController.getPlayers);
router.get('/:code/spins', roomController.getSpinHistory);
router.get('/:code/messages', roomController.getChatHistory);

module.exports = router;
