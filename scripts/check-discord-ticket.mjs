#!/usr/bin/env node
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (key) => {
  const m = env.match(new RegExp(`${key}=(?:\"|')?(.*?)(?:\"|')?$`, 'm'));
  return m ? m[1].replace(/^\"|\"$/g, '') : process.env[key];
};

const DISCORD_BOT_TOKEN = get('DISCORD_BOT_TOKEN');
const GUILD_ID = get('DISCORD_GUILD_ID');
const ORDER_ID = process.argv[2] || 'd71581a1-0c16-487c-9794-5afd94505c9a';
const prefix = `pedido-${ORDER_ID.slice(0,8)}`;

if (!DISCORD_BOT_TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in .env.local');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });

    if (!res.ok) {
      console.error('Discord API error', res.status, await res.text());
      process.exit(1);
    }

    const channels = await res.json();
    const found = channels.filter(c => c.name && c.name.startsWith(prefix));

    if (found.length === 0) {
      console.log('No ticket channel found for', prefix);
    } else {
      console.log('Found ticket channels:');
      for (const c of found) {
        console.log(`- ${c.name} (id: ${c.id}, type: ${c.type})`);
      }
    }
  } catch (err) {
    console.error('Error checking Discord:', err);
    process.exit(1);
  }
})();
