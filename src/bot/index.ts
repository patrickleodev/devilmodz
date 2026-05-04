import "reflect-metadata";

import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Interaction,
  type SlashCommandStringOption,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ensureDataSource } from "../lib/db";
import { Order } from "../entities/Order";
import { DeliveryLog } from "../entities/DeliveryLog";
import { buildDeliveryMessage, buildOrderPaidMessage, sendDiscordChannelMessage } from "../lib/discord";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID;

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN is not configured");
}

if (!clientId) {
  throw new Error("DISCORD_CLIENT_ID is not configured");
}

const commands = [
  new SlashCommandBuilder()
    .setName("pedido-status")
    .setDescription("Mostra o status de um pedido")
    .addStringOption((option: SlashCommandStringOption) => option.setName("id").setDescription("ID do pedido").setRequired(true)),
  new SlashCommandBuilder()
    .setName("pedido-entregar")
    .setDescription("Marca um pedido como entregue")
    .addStringOption((option: SlashCommandStringOption) => option.setName("id").setDescription("ID do pedido").setRequired(true))
    .addStringOption((option: SlashCommandStringOption) => option.setName("observacao").setDescription("Detalhe opcional da entrega").setRequired(false)),
].map((command) => command.toJSON());

const registerCommands = async () => {
  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands,
  });
};

const hasStaffAccess = (interaction: ChatInputCommandInteraction) => {
  if (interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    return true;
  }

  if (!staffRoleId) {
    return false;
  }

  const member = interaction.member as
    | {
        roles?: {
          cache?: {
            has: (roleId: string) => boolean;
          };
        };
      }
    | null;

  return Boolean(member?.roles?.cache?.has(staffRoleId));
};

const sendStatusReply = async (interaction: ChatInputCommandInteraction) => {
  const orderId = interaction.options.getString("id", true);
  const dataSource = await ensureDataSource();
  const orderRepository = dataSource.getRepository(Order);
  const order = await orderRepository.findOneBy({ id: orderId });

  if (!order) {
    await interaction.reply({ content: "Pedido não encontrado.", ephemeral: true });
    return;
  }

  await interaction.reply({
    content: [
      `Pedido: ${order.id}`,
      `Produto: ${order.product?.title || order.productId}`,
      `Status: ${order.status}`,
      `Valor: R$ ${order.amount}`,
    ].join("\n"),
    ephemeral: true,
  });
};

const markDelivered = async (interaction: ChatInputCommandInteraction) => {
  if (!hasStaffAccess(interaction)) {
    await interaction.reply({ content: "Você não tem permissão para marcar entregas.", ephemeral: true });
    return;
  }

  const orderId = interaction.options.getString("id", true);
  const note = interaction.options.getString("observacao");
  const dataSource = await ensureDataSource();
  const orderRepository = dataSource.getRepository(Order);
  const deliveryLogRepository = dataSource.getRepository(DeliveryLog);
  const order = await orderRepository.findOneBy({ id: orderId });

  if (!order) {
    await interaction.reply({ content: "Pedido não encontrado.", ephemeral: true });
    return;
  }

  order.status = "delivered";
  await orderRepository.save(order);

  await deliveryLogRepository.save(
    deliveryLogRepository.create({
      orderId: order.id,
      deliveredBy: interaction.user.tag,
      message: note || "Entregue via bot Discord.",
    })
  );

  const channelMessage = buildDeliveryMessage({
    orderId: order.id,
    productTitle: order.product?.title || order.productId,
    deliveredBy: interaction.user.tag,
    note: note || undefined,
  });

  await sendDiscordChannelMessage(channelMessage);

  await interaction.reply({
    content: note ? `Pedido marcado como entregue. Observação: ${note}` : "Pedido marcado como entregue.",
    ephemeral: true,
  });
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async () => {
  await registerCommands();
  console.log(`Bot conectado como ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "pedido-status") {
    await sendStatusReply(interaction);
    return;
  }

  if (interaction.commandName === "pedido-entregar") {
    await markDelivered(interaction);
  }
});

const bootstrap = async () => {
  await ensureDataSource();
  await sendDiscordChannelMessage("Bot do Devilmodz iniciado e pronto para receber comandos.");
  await client.login(token);
};

void bootstrap();
