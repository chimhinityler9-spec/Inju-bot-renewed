'use strict';

// +logs        -> creates a private #server-logs channel and starts logging there
// +logs here   -> uses the channel you type it in
// +logs off    -> stops using the saved channel (falls back to env settings)

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const ui = require('../utils/ui');
const serverLogs = require('../utils/serverLogs');

async function execute(message, args) {
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Administrator')] });
  }

  const guild = message.guild;
  const sub = (args[0] || '').toLowerCase();

  try {
    if (sub === 'off') {
      await serverLogs.setLogChannel(guild.id, '');
      return message.reply({ embeds: [ui.success(message.client, 'Logs Off', 'Saved log channel cleared.')] });
    }

    let channel;
    if (sub === 'here') {
      channel = message.channel;
    } else {
      const me = await guild.members.fetchMe();
      channel = await guild.channels.create({
        name: 'server-logs',
        type: ChannelType.GuildText,
        reason: `Log channel created by ${message.author.tag}`,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
          ...guild.roles.cache
            .filter((r) => r.permissions.has(PermissionFlagsBits.Administrator) && !r.managed)
            .map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] })),
        ],
      });
    }

    await serverLogs.setLogChannel(guild.id, channel.id);
    await message.reply({
      embeds: [ui.success(
        message.client,
        'Log Channel Set',
        `Logging to <#${channel.id}>: members joining/leaving, profile edits (username, display name, avatar), nickname changes, and roles added/removed.`,
      )],
    });
  } catch (err) {
    await message.reply({ embeds: [ui.error(message.client, 'Log Setup Failed', err.message)] });
  }
}

module.exports = { name: 'logs', description: 'Create or set the server log channel', execute };
