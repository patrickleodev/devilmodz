import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

const getDiscordToken = () => process.env.DISCORD_BOT_TOKEN;
const getNotificationChannelId = () => process.env.DISCORD_NOTIFICATION_CHANNEL_ID;
const getTicketChannelId = () => process.env.DISCORD_TICKET_CHANNEL_ID || getNotificationChannelId();
const getGuildId = () => process.env.DISCORD_GUILD_ID;

export const isDiscordNotificationsEnabled = () => {
  return Boolean(getDiscordToken() && getNotificationChannelId());
};

const createRestClient = () => {
  const token = getDiscordToken();

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  return new REST({ version: "10" }).setToken(token);
};

type DiscordChannelMessage = {
  id: string;
  channel_id: string;
};

const postDiscordChannelMessage = async (content: string, channelId = getNotificationChannelId()) => {
  if (!channelId) {
    return null;
  }

  return createRestClient().post(Routes.channelMessages(channelId), {
    body: { content },
  }) as Promise<DiscordChannelMessage>;
};

export const sendDiscordChannelMessage = async (content: string) => {
  const message = await postDiscordChannelMessage(content);

  if (!message) {
    return false;
  }

  return true;
};

export const buildOrderPaidMessage = (input: {
  orderId: string;
  productTitle: string;
  amount: number;
  mention?: string | null;
  userEmail?: string | null;
  providerLabel?: string | null;
}) => {
  const customerLabel = input.userEmail ? `\nCliente: ${input.userEmail}` : "";
  const providerLabel = input.providerLabel ? ` via ${input.providerLabel}` : "";
  const mentionLabel = input.mention ? `${input.mention} ` : "";

  return [
    `${mentionLabel}Pedido aprovado${providerLabel}.`,
    `Pedido: ${input.orderId}`,
    `Produto: ${input.productTitle}`,
    `Valor: R$ ${input.amount}`,
    customerLabel,
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildOrderCreatedMessage = (input: {
  orderId: string;
  productTitle: string;
  amount: number;
  mention?: string | null;
  userEmail?: string | null;
}) => {
  const customerLabel = input.userEmail ? `\nCliente: ${input.userEmail}` : "";
  const mentionLabel = input.mention ? `${input.mention} ` : "";

  return [
    `${mentionLabel}Novo pedido criado.`,
    `Pedido: ${input.orderId}`,
    `Produto: ${input.productTitle}`,
    `Valor: R$ ${input.amount}`,
    customerLabel,
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildDeliveryMessage = (input: {
  orderId: string;
  productTitle: string;
  deliveredBy: string;
  note?: string;
}) => {
  return [
    "Pedido marcado como entregue.",
    `Pedido: ${input.orderId}`,
    `Produto: ${input.productTitle}`,
    `Entregue por: ${input.deliveredBy}`,
    input.note ? `Observação: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

export const createOrderTicketThread = async (input: {
  orderId: string;
  productTitle: string;
  amount: number;
  mention?: string | null;
  userEmail?: string | null;
  providerLabel?: string | null;
}) => {
  const channelId = getTicketChannelId();

  if (!channelId) {
    return null;
  }

  const message = await postDiscordChannelMessage(
    buildOrderPaidMessage({
      orderId: input.orderId,
      productTitle: input.productTitle,
      amount: input.amount,
      mention: input.mention || null,
      userEmail: input.userEmail || null,
      providerLabel: input.providerLabel || null,
    }),
    channelId
  );

  if (!message) {
    return null;
  }

  const threadName = `pedido-${input.orderId.slice(0, 8)}`;
  const thread = (await createRestClient().post(Routes.threads(channelId, message.id), {
    body: {
      name: threadName,
      auto_archive_duration: 1440,
    },
  })) as { id?: string };

  if (!thread?.id) {
    return {
      messageId: message.id,
      threadId: null,
      threadUrl: null,
    };
  }

  const guildId = getGuildId();

  return {
    messageId: message.id,
    threadId: thread.id,
    threadUrl: guildId ? `https://discord.com/channels/${guildId}/${thread.id}` : null,
  };
};

export const archiveThread = async (threadId?: string | null) => {
  if (!threadId) return false;
  try {
    await createRestClient().patch(Routes.channel(threadId), { body: { archived: true } });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to archive thread:', err);
    return false;
  }
};

export const createInviteLink = async (channelId?: string | null) => {
  const targetChannel = channelId || getTicketChannelId();

  if (!targetChannel) return null;

  try {
    const invite = (await createRestClient().post(Routes.channelInvites(targetChannel), {
      body: {
        max_age: 0, // permanent (no expiration)
        max_uses: 0, // unlimited uses
        unique: false, // reuse existing invites for same channel
      },
    })) as any;

    // Discord may return either a full url or a code
    if (!invite) return null;

    if (invite.url) return invite.url as string;
    if (invite.code) return `https://discord.gg/${invite.code}`;

    return null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Failed to create invite:", err);
    return null;
  }
};
