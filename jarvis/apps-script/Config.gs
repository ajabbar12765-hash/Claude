/**
 * ============================================================
 *  JARVIS — YOUR SETTINGS  (this is the only file you edit)
 * ============================================================
 */

const SETTINGS = {
  // What Jarvis calls you.
  YOUR_NAME: 'Boss',

  // Free key from https://aistudio.google.com/apikey
  GEMINI_API_KEY: 'PASTE_YOUR_GEMINI_KEY_HERE',

  // Leave as-is unless Google retires it. Always points at the newest free Flash model.
  GEMINI_MODEL: 'gemini-flash-latest',

  // Optional: Discord bot token (see SETUP.md, step 5). Leave '' to skip Discord.
  DISCORD_BOT_TOKEN: '',

  // How long Jarvis keeps watching for a reply after sending a message.
  WATCH_MINUTES: 180,

  // How many times Jarvis may auto-reply in a single conversation before stopping.
  MAX_AUTO_REPLIES: 3,
};

/**
 * Your people. Say their name to Jarvis ("message Sam on Discord").
 * Fill in whatever you have — every field is optional.
 *
 *   email           : their email address
 *   discord_id      : their Discord USER ID (a long number, see SETUP.md)
 *   discord_channel : a Discord server CHANNEL ID (for group chats like your squad)
 *   phone           : with country code, digits only (WhatsApp / iMessage), e.g. '15551234567'
 *   aliases         : other names you might call them
 */
const CONTACTS = {
  'sam': {
    email: '',
    discord_id: '',
    phone: '',
    aliases: ['sammy'],
  },
  'squad': {
    discord_channel: '',
    aliases: ['the squad', 'group chat', 'the boys'],
  },
  'mom': {
    phone: '',
    email: '',
    aliases: ['mum', 'mother'],
  },
};
