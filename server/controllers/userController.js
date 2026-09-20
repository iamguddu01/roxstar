const userModel = require('../models/userModel');

const userController = {
  async loginOrRegister(req, res) {
    try {
      const { username } = req.body;
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required.' });
      }
      const trimmed = username.trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        return res.status(400).json({ error: 'Username must be between 2 and 30 characters.' });
      }
      const user = await userModel.findOrCreate(trimmed);
      return res.status(200).json({ success: true, user });
    } catch (err) {
      console.error('Error in loginOrRegister:', err);
      return res.status(500).json({ error: 'Failed to process user.' });
    }
  },

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({ success: true, user });
    } catch (err) {
      console.error('Error in getUser:', err);
      return res.status(500).json({ error: 'Failed to fetch user.' });
    }
  },
};

module.exports = userController;
