// App-level configuration.
//
// Telegram: set these to YOUR ToolBox bot so the in-app "Connect on Telegram"
// cards point at the right place. Create/own the bot via @BotFather, then the
// public link is https://t.me/<handle> (no @). Until you set a real handle the
// connect card stays hidden, so it never ships a dead link.
export const TELEGRAM_BOT_HANDLE = 'JaisOwnBot'; // the ToolBox bot (no @)

export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_HANDLE}`;

// True once a real handle has been set (used to gate the connect UI).
export const TELEGRAM_CONFIGURED = TELEGRAM_BOT_HANDLE !== 'YourToolBoxBot' && !!TELEGRAM_BOT_HANDLE;
