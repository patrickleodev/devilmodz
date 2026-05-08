import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TICKET_CHANNEL_ID = process.env.DISCORD_TICKET_CHANNEL_ID;

const requiredEnvs = [
  { key: "DISCORD_BOT_TOKEN", value: TOKEN },
  { key: "DISCORD_GUILD_ID", value: GUILD_ID },
  { key: "DISCORD_TICKET_CHANNEL_ID", value: TICKET_CHANNEL_ID },
];

console.log("🔍 Validando configuração Discord...\n");

// Check env vars
const missingEnvs = requiredEnvs.filter((e) => !e.value);
if (missingEnvs.length > 0) {
  console.error("❌ Variáveis de ambiente faltando:");
  missingEnvs.forEach((e) => console.error(`   - ${e.key}`));
  process.exit(1);
}

console.log("✅ Variáveis de ambiente OK\n");

const checkPermissions = async () => {
  try {
    // Fetch bot user info
    const botResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${TOKEN}` },
    });

    if (!botResponse.ok) {
      console.error(`❌ Token inválido ou expirado: ${botResponse.status}`);
      process.exit(1);
    }

    const botUser = await botResponse.json();
    console.log(`✅ Bot identificado: ${botUser.username}\n`);

    // Fetch channel info
    const channelResponse = await fetch(
      `https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}`,
      { headers: { Authorization: `Bot ${TOKEN}` } }
    );

    if (!channelResponse.ok) {
      console.error(`❌ Canal não encontrado (${channelResponse.status}). Verifique DISCORD_TICKET_CHANNEL_ID.`);
      process.exit(1);
    }

    const channel = await channelResponse.json();
    console.log(`✅ Canal encontrado: #${channel.name} (${channel.id})\n`);

    // Test: Try to create a test thread and delete it
    console.log("🧪 Testando permissão de criar thread...\n");

    const testMessageResponse = await fetch(
      `https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "🧪 Teste de permissão (será deletado em breve)",
        }),
      }
    );

    if (!testMessageResponse.ok) {
      const error = await testMessageResponse.text();
      console.error(`❌ Bot não pode enviar mensagens: ${testMessageResponse.status}`);
      console.error(`   Erro: ${error}`);
      process.exit(1);
    }

    const testMessage = await testMessageResponse.json();
    console.log(`✅ Bot pode enviar mensagens\n`);

    // Test: Create a thread
    const threadResponse = await fetch(
      `https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/${testMessage.id}/threads`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-thread",
          auto_archive_duration: 1440,
        }),
      }
    );

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error(`❌ Bot não pode criar threads: ${threadResponse.status}`);
      console.error(`   Erro: ${error}`);
      console.error(`\n💡 Solução: Vá ao Discord, clique direito no canal, Editar > Permissões`);
      console.error(`   Procure pelo bot e certifique que "Create Public Threads" está ✅\n`);
      
      // Delete test message
      await fetch(
        `https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages/${testMessage.id}`,
        { method: "DELETE", headers: { Authorization: `Bot ${TOKEN}` } }
      );
      
      process.exit(1);
    }

    const thread = await threadResponse.json();
    console.log(`✅ Bot pode criar threads\n`);

    // Clean up: Delete test thread and message
    await fetch(
      `https://discord.com/api/v10/channels/${thread.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: true }),
      }
    );

    await fetch(
      `https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages/${testMessage.id}`,
      { method: "DELETE", headers: { Authorization: `Bot ${TOKEN}` } }
    );

    console.log("🎉 Tudo pronto! Bot tem todas as permissões necessárias.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao validar:", error.message);
    process.exit(1);
  }
};

checkPermissions();
