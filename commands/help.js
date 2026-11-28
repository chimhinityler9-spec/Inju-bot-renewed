'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config/bot');
const theme  = require('../utils/theme');
const EMOJI  = require('../utils/emojis');
const ui     = require('../utils/ui');
const eb     = require('../utils/embedBuilder');
const ce     = require('../utils/customEmojis');
const { icon, iconUnicode } = require('../utils/iconMap');

function safeUpper(value, fallback = 'UNKNOWN') {
  if (value === null || value === undefined) return fallback;
  return String(value).toUpperCase();
}

const CATEGORIES = {
  general: {
    emoji:       iconUnicode('CAT_SOCIAL'),
    glyph:       iconUnicode('CAT_SOCIAL'),
    banner:      icon('CAT_SOCIAL'),
    label:       'General Commands',
    description: 'Info, invites, reputation and support',
    color:       theme.BLUEBLACK,
    commands: [
      { name: 'help',                  desc: 'Open this menu' },
      { name: 'info',                  desc: 'Server info — member count, creation date, boost level' },
      { name: 'serverinfo',            desc: 'Detailed server stats — members, channels, roles, boosts' },
      { name: 'botinfo',               desc: 'Bot version, uptime, health, command stats' },
      { name: 'invite [@user]',        desc: 'Show how many people a member has invited' },
      { name: 'vouch [@user] [note]',  desc: 'Add a vouch to a member\'s reputation card' },
      { name: 'vouch [@user]',         desc: 'View someone\'s full vouch history and tier badge' },
      { name: 'ticket',                desc: 'Open a support ticket — category selector appears' },
      { name: 'support',               desc: 'Direct-link shortcut to open a support ticket' },
    ],
  },
  tools: {
    emoji:       iconUnicode('CAT_TOOLS'),
    glyph:       iconUnicode('CAT_TOOLS'),
    banner:      icon('CAT_TOOLS'),
    label:       'Tools & Utilities',
    description: 'Profile tools, formatting helpers, messaging',
    color:       theme.DARK_BLUE,
    commands: [
      { name: 'avatar [@user]',         desc: 'High-res avatar card with download links for 4 sizes' },
      { name: 'banner [@user|<id>]',    desc: 'Show a member\'s profile banner with download links' },
      { name: 'userinfo [@user]',       desc: 'Discord profile card — ID, timestamps, roles, account age' },
      { name: 'hyperlink <url> <text>', desc: 'Generate a masked hyperlink — [text](url) format' },
      { name: 'dm @user <message>',     desc: 'Send a DM to a member via the bot' },
    ],
  },
  moderation: {
    emoji:       iconUnicode('CAT_MODERATION'),
    glyph:       iconUnicode('CAT_MODERATION'),
    banner:      icon('CAT_MODERATION'),
    label:       'Moderation',
    description: 'Ban management and member actions',
    color:       theme.DANGER,
    commands: [
      { name: 'purge <1-100>',                  desc: 'Delete the last N messages, or reply to a message and use +purge to delete everything after it' },
      { name: 'timeout @user <min> [reason]',   desc: 'Timeout a member for X minutes' },
      { name: 'kick @user [reason]',            desc: 'Kick a member from the server' },
      { name: 'ban @user|<id> [reason]',        desc: 'Ban a member — accepts @mention or raw user ID' },
      { name: 'unban @user|<id> [reason]',      desc: 'Unban a member — accepts @mention or raw user ID' },
      { name: 'warn @user <reason>',            desc: 'Issue a warning to a member' },
      { name: 'warnings [@user]',               desc: 'View warning history for a member' },
      { name: 'slowmode <seconds>',             desc: 'Set channel slowmode (0 = off)' },
      { name: 'lock',                           desc: 'Lock the current channel' },
      { name: 'unlock',                         desc: 'Unlock the current channel' },
      { name: 'role
