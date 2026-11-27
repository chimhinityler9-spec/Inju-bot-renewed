'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config/bot');

/* ─────────────── Owner command settings ─────────────── */

// Only these Discord user IDs can use +owner. Everyone else is ignored silently.
// Set OWNER_ID in Railway (several IDs can be separated with commas) to choose who.
// If OWNER_ID is not set, the ID below is used.
const FALLBACK_OWNER_IDS = ['857527349028847617'];
const OWNER_IDS = config.ownerId
  ? config.ownerId.split(',').map((x) => x.trim()).filter(Boolean)
  : FALLBACK_OWNER_IDS;
const EMBED_COLOR = 0x0b0b0f;

function card(title, lines) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(title)
    .setDescription(lines.join('\n'));
}

/** Finds who to give the roles to: @mention, user ID, or username. No input = the sender. */
async function resolveTarget(message, args) {
  const guild = message.guild;
  const mentioned = message.mentions.members?.first();
  if (mentioned) return mentioned;

  const query = args.join(' ').replace(/^[@(]+|[)]+$/g, '').trim();
  if (!query) return guild.members.fetch(message.author.id);

  if (/^\d{15,25}$/.test(query)) return guild.members.fetch(query).catch(() => null);

  const found = await guild.members.search({ query, limit: 5 }).catch(() => null);
  if (!found || !found.size) return null;
  const lower = query.toLowerCase();
  return found.find((m) =>
    m.user.username.toLowerCase() === lower || m.displayName.toLowerCase() === lower,
  ) || found.first();
}

async function execute(message, args = []) {
  if (!message.guild) return;
  if (!OWNER_IDS.includes(message.author.id)) return; // not the owner: say nothing

  const guild = message.guild;

  try {
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({
        embeds: [card('OWNER ACCESS', ['❌ I need the **Manage Roles** permission to give roles.'])],
      });
    }

    await guild.roles.fetch();
    const member = await resolveTarget(message, args);
    if (!member) {
      return message.reply({
        embeds: [card('OWNER ACCESS', ['❌ I could not find that member. Use `+owner @user`, `+owner userID` or `+owner username`.'])],
        allowedMentions: { parse: [] },
      });
    }
    const self = member.id === message.author.id;
    const botTop = me.roles.highest;

    // Roles the bot is allowed to hand out: below its own top role, not @everyone,
    // and not "managed" roles (bot, integration and booster roles).
    const givable = guild.roles.cache.filter(
      (r) => r.id !== guild.id && !r.managed && r.comparePositionTo(botTop) < 0,
    );
    const toAdd = givable.filter((r) => !member.roles.cache.has(r.id));

    const managedCount = guild.roles.cache.filter(
      (r) => r.id !== guild.id && r.managed && !member.roles.cache.has(r.id),
    ).size;
    const aboveCount = guild.roles.cache.filter(
      (r) => r.id !== guild.id && !r.managed && r.comparePositionTo(botTop) >= 0
        && !member.roles.cache.has(r.id),
    ).size;

    if (toAdd.size) {
      await member.roles.add([...toAdd.keys()], `Owner command (+owner) by ${message.author.tag}`);
    }

    const highest = givable.sort((a, b) => b.position - a.position).first();
    const lines = [
      toAdd.size
        ? `✅ Gave ${self ? 'you' : `<@${member.id}>`} **${toAdd.size}** role${toAdd.size === 1 ? '' : 's'}.`
        : `✅ ${self ? 'You already have' : `<@${member.id}> already has`} every role I can give.`,
      highest ? `🔹 **Highest role I can give:** <@&${highest.id}>` : '',
      aboveCount
        ? `🔹 **${aboveCount}** role${aboveCount === 1 ? ' is' : 's are'} above my role, so I can't give ${aboveCount === 1 ? 'it' : 'them'}. Drag my role higher in **Server Settings → Roles**.`
        : '',
      managedCount
        ? `🔹 **${managedCount}** bot/integration role${managedCount === 1 ? '' : 's'} can't be given to people (Discord rule).`
        : '',
    ].filter(Boolean);

    logger.info(`+owner used by ${message.author.tag} on ${member.user.tag}: added ${toAdd.size} role(s)`);
    await message.reply({
      embeds: [card('OWNER ACCESS', lines)],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error(`+owner failed: ${err.message}`);
    const hint = /Missing Permissions|50013/i.test(err.message)
      ? "\nDiscord says I'm not allowed to edit that member. Drag my role **above your highest role** in **Server Settings → Roles**."
      : '';
    message.reply({
      embeds: [card('OWNER ACCESS', [`❌ Could not give roles: ${err.message}${hint}`])],
    }).catch(() => {});
  }
}

module.exports = { name: 'owner', description: 'Give yourself (or another member) every role the bot can give', execute };
