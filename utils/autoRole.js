'use strict';

// Per-server autorole: a role given automatically to everyone who joins.
// Saved in MongoDB when available; falls back to in-memory (forgotten on restart) otherwise.

let Setting = null;
try { Setting = require('../database/models/Setting'); } catch (_) { Setting = null; }
let mongoose = null;
try { mongoose = require('mongoose'); } catch (_) { mongoose = null; }
const dbReady = () => !!(mongoose && mongoose.connection && mongoose.connection.readyState === 1);

const cache = new Map(); // guildId -> roleId

async function load() {
  if (!Setting || !dbReady()) return;
  try {
    const rows = await Setting.find({ autoRoleId: { $ne: '' } }).lean();
    for (const r of rows) cache.set(r.guildId, r.autoRoleId);
  } catch (_) { /* ignore, falls back to env/none */ }
}

async function setAutoRole(guildId, roleId) {
  if (roleId) cache.set(guildId, roleId); else cache.delete(guildId);
  if (Setting && dbReady()) {
    await Setting.updateOne(
      { guildId },
      { $set: { autoRoleId: roleId, updatedAt: new Date() } },
      { upsert: true },
    );
  }
}

function getAutoRole(guildId) {
  return cache.get(guildId) || process.env.AUTO_ROLE_ID || '';
}

module.exports = { load, setAutoRole, getAutoRole };
