'use strict';

// +dmall <message>  -> sends the same DM to every member, including bots (admins only)

const { PermissionFlagsBits } = require('discord.js');
const ui = require('../utils/ui');
const logger = require('../utils/logger');

async function execute(message, args = []) {
  const member = message.member;
  if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Administrator')] });
  }

  const text = args.join(' ').trim();
  if (!text) {
    return message.reply({ embeds: [ui.error(message.client, 'DM All', 'Give a message to send: `+dmall Hello everyone!`')] });
  }

  const guild = message.guild;

  const confirmMsg = await message.reply({
    embeds: [ui.warning(message.client, 'DM All', `This DMs every member of **${guild.name}** (bots included) with your message. Reply **yes** within 30 seconds to confirm.`)],
  });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id && m.content.trim().toLowerCase() === 'yes',
      max: 1,
      time: 30000,
    });
    if (!collected.size) {
      return confirmMsg.edit({ embeds: [ui.error(message.client, 'DM All', 'Timed out — nothing was sent.')] });
    }
  } catch (_) {
    return confirmMsg.edit({ embeds: [ui.error(message.client, 'DM All', 'Timed out — nothing was sent.')] });
  }

  const status = await message.channel.send({ embeds: [ui.info(message.client, 'DM All', 'Sending…')] });

  const members = await guild.members.fetch();
  let sent = 0;
  let failed = 0;

  for (const [, m] of members) {
    try {
      await m.send(text);
      sent++;
    } catch (err) {
      failed++; // DMs closed, blocked the bot, etc.
    }
    await new Promise((r) => setTimeout(r, 400)); // slow down to avoid rate limits
  }

  logger.info(`+dmall by ${message.author.tag}: sent ${sent}, failed ${failed}`);

  await status.edit({
    embeds: [ui.success(
      message.client,
      'DM All Complete',
      `Sent to **${sent}** member${sent === 1 ? '' : 's'}.\nCould not deliver to **${failed}** (DMs closed or blocked the bot).`,
    )],
  });
}

module.exports = { name: 'dmall', description: 'DM every member of the server', execute };
