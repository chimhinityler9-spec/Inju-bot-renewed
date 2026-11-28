const mongoose = require('mongoose');

// Small per-server settings store (log channel, autorole).
const settingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String, default: '' },
  autoRoleId: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Setting', settingSchema);
