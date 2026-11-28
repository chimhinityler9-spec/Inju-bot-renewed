'use strict';

// +autorole add <role>   -> everyone who joins gets this role automatically
// +autorole remove       -> turns autorole off
// +autorole              -> shows the current setting

const { PermissionFlagsBits } = require('discord.js');
const ui = require('../utils/ui');
const autoRole = require('../utils/autoRole');

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
  const sub = (args[0] || '').toLowerCase();

  try {
    if (!sub) {
      const current = autoRole.getAutoRole(guild.id);
      const role = current && guild.roles.cache.get(current);
      return message.reply({
        embeds: [ui.info(
          message.client,
          'Autorole',
          role ? `New members automatically get <@&${role.id}>.` : 'Autorole is off. Use `+autorole add @role` to turn it on.',
        )],
        allowedMentions: { roles: [] },
      });
    }

    if (sub === 'remove' || sub === 'off') {
      await autoRole.setAutoRole(guild.id, '');
      return message.reply({ embeds: [ui.success(message.client, 'Autorole Off', 'New members will no longer get a role automatically.')] });
    }

    if (sub === 'add' || sub === 'set') {
      const role = resolveRole(guild, message, args.slice(1));
      if (!role) {
        return message.reply({ embeds: [ui.error(message.client, 'Autorole', 'Mention a role, or give its name or ID: `+autorole add @Member`')] });
      }
      const me = await guild.members.fetchMe();
      if (role.position >= me.roles.highest.position) {
        return message.reply({ embeds: [ui.error(message.client, 'Autorole', `My role needs to be above **${role.name}** for me to give it out.`)] });
      }
      await autoRole.setAutoRole(guild.id, role.id);
      return message.reply({ embeds: [ui.success(message.client, 'Autorole Set', `New members will now automatically get <@&${role.id}>.`)], allowedMentions: { roles: [] } });
    }

    return message.reply({ embeds: [ui.error(message.client, 'Autorole', 'Usage: `+autorole add @role`, `+autorole remove`, or `+autorole` to check.')] });
  } catch (err) {
    await message.reply({ embeds: [ui.error(message.client, 'Autorole Failed', err.message)] });
  }
}

module.exports = { name: 'autorole', description: 'Set a role new members get automatically', execute };
