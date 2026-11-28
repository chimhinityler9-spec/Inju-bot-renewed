'use strict';

// +roleall <role>  -> gives one role to every member in the server (admins only)

const { PermissionFlagsBits } = require('discord.js');
const ui = require('../utils/ui');
const logger = require('../utils/logger');

function resolveRole(guild, message, args) {
  const mentioned = message.mentions.roles.first();
  if (mentioned) return mentioned;
  const query = args.join(' ').trim();
  if (!query) return null;
  if (/^\d{15,25}$/.test(query)) return guild.roles.cache.get(query) || null;
  const lower = query.toLowerCase();
  return guild.roles.cache.find((r) => r.name.toLowerCase() === lower) || null;
}

async function execute(message, args = []) {
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Administrator')] });
  }

  const guild = message.guild;
  const role = resolveRole(guild, message, args);
  if (!role) {
    return message.reply({ embeds: [ui.error(message.client, 'Role All', 'Mention a role, or give its name or ID: `+roleall @Member`')] });
  }

  const me = await guild.members.fetchMe();
  if (role.position >= me.roles.highest.position) {
    return message.reply({ embeds: [ui.error(message.client, 'Role All', `My role needs to be above **${role.name}** for me to give it out.`)] });
  }

  const confirmMsg = await message.reply({
    embeds: [ui.warning(message.client, 'Role All', `This gives <@&${role.id}> to every member in the server. Reply **yes** within 30 seconds to confirm.`)],
    allowedMentions: { roles: [] },
  });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id && m.content.trim().toLowerCase() === 'yes',
      max: 1,
      time: 30000,
    });
    if (!collected.size) {
      return confirmMsg.edit({ embeds: [ui.error(message.client, 'Role All', 'Timed out — nothing was changed.')] });
    }
  } catch (_) {
    return confirmMsg.edit({ embeds: [ui.error(message.client, 'Role All', 'Timed out — nothing was changed.')] });
  }

  const status = await message.channel.send({ embeds: [ui.info(message.client, 'Role All', 'Working through the member list…')] });

  const members = await guild.members.fetch();
  let given = 0;
  let skipped = 0;
  let failed = 0;

  for (const [, m] of members) {
    if (m.roles.cache.has(role.id)) { skipped++; continue; }
    try {
      await m.roles.add(role);
      given++;
    } catch (err) {
      failed++;
      logger.warn(`roleall: failed on ${m.user.tag}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // slow down to avoid rate limits
  }

  await status.edit({
    embeds: [ui.success(
      message.client,
      'Role All Complete',
      `Gave <@&${role.id}> to **${given}** member${given === 1 ? '' : 's'}.\nAlready had it: **${skipped}**\nFailed: **${failed}**`,
    )],
    allowedMentions: { roles: [] },
  });
}

module.exports = { name: 'roleall', description: 'Give a role to every member in the server', execute };
