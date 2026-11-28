'use strict';

// /dmall — sends the same embed DM to every member of the server (admins only).
// Self-contained, same pattern as utils/giveaway.js: registers its own slash
// command per guild and listens for its own interactions.

const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const logger = require('./logger');

const EMBED_COLOR = 0x0b0b0f;
const EPHEMERAL = MessageFlags.Ephemeral;
const DELAY_MS = 400; // paced to avoid Discord rate limits

function validUrl(url) {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim()) ? url.trim() : null;
}

const slashCommand = new SlashCommandBuilder()
  .setName('dmall')
  .setDescription('DM every member of the server')
  .addStringOption((o) => o.setName('description').setDescription('Main message text').setRequired(true).setMaxLength(2000))
  .addStringOption((o) => o.setName('caption').setDescription('Title shown above the description'))
  .addStringOption((o) => o.setName('footer').setDescription('Small text at the bottom of the message'))
  .addStringOption((o) => o.setName('link').setDescription('Optional link — shown as a button'))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

function isAllowed(member) {
  return !!member?.permissions?.has?.(PermissionFlagsBits.Administrator);
}

function buildPayload(interaction, client) {
  const caption = interaction.options.getString('caption');
  const description = interaction.options.getString('description');
  const footer = interaction.options.getString('footer');
  const link = validUrl(interaction.options.getString('link'));

  const embed = new EmbedBuilder().setColor(EMBED_COLOR).setDescription(description);
  if (caption) embed.setTitle(caption);
  if (footer) embed.setFooter({ text: footer });

  const payload = { embeds: [embed] };
  if (link) {
    payload.components = [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Open Link').setStyle(ButtonStyle.Link).setURL(link),
    )];
  }
  return payload;
}

async function handleSlash(interaction) {
  if (!interaction.inGuild()) return;
  if (!isAllowed(interaction.member)) {
    return interaction.reply({ content: '❌ Only admins can use this.', flags: EPHEMERAL });
  }

  const guild = interaction.guild;
  const payload = buildPayload(interaction, interaction.client);

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dmall_confirm').setLabel('Send to everyone').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dmall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: `This DMs **every member** of **${guild.name}** (bots included). Here's a preview:`,
    embeds: payload.embeds,
    components: [...(payload.components || []), confirmRow],
    flags: EPHEMERAL,
  });

  let choice;
  try {
    choice = await interaction.channel.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && ['dmall_confirm', 'dmall_cancel'].includes(i.customId),
      time: 30000,
    });
  } catch (_) {
    return interaction.editReply({ content: '⏱️ Timed out — nothing was sent.', components: [] });
  }

  if (choice.customId === 'dmall_cancel') {
    return choice.update({ content: '❌ Cancelled — nothing was sent.', components: [] });
  }

  await choice.update({ content: '📨 Sending…', components: [] });

  const members = await guild.members.fetch();
  let sent = 0;
  let failed = 0;
  for (const [, m] of members) {
    try {
      await m.send({ embeds: payload.embeds, components: payload.components });
      sent++;
    } catch (_) {
      failed++; // DMs closed, blocked the bot, etc.
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  logger.info(`/dmall by ${interaction.user.tag}: sent ${sent}, failed ${failed}`);
  await interaction.editReply({
    content: `✅ Sent to **${sent}** member${sent === 1 ? '' : 's'}. Could not deliver to **${failed}** (DMs closed or blocked the bot).`,
    embeds: [],
    components: [],
  });
}

async function onInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'dmall') await handleSlash(interaction);
  } catch (err) {
    logger.error(`/dmall interaction error: ${err.message}`);
    const payload = { content: '❌ Something went wrong.', flags: EPHEMERAL };
    if (interaction.deferred || interaction.replied) interaction.followUp(payload).catch(() => {});
    else interaction.reply(payload).catch(() => {});
  }
}

async function registerSlash(guild) {
  try {
    await guild.commands.create(slashCommand.toJSON());
  } catch (err) {
    logger.warn(`Could not register /dmall in ${guild.name}: ${err.message} (the bot may need the "applications.commands" invite scope)`);
  }
}

function init(client) {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    for (const guild of client.guilds.cache.values()) registerSlash(guild);
    logger.info('/dmall ready');
  };

  client.once('ready', start);
  client.once('clientReady', start);
  if (client.isReady && client.isReady()) start();

  client.on('guildCreate', registerSlash);
  client.on('interactionCreate', onInteraction);
}

module.exports = { init };
