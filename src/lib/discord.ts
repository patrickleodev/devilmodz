import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

const getDiscordToken = () => process.env.DISCORD_BOT_TOKEN;
const getNotificationChannelId = () => process.env.DISCORD_NOTIFICATION_CHANNEL_ID;

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

export const sendDiscordChannelMessage = async (content: string) => {
  const channelId = getNotificationChannelId();

  if (!channelId) {
    return false;
  }

  await createRestClient().post(Routes.channelMessages(channelId), {
    body: { content },
  });

  return true;
};

export const buildOrderPaidMessage = (input: {
  orderId: string;
  productTitle: string;
  amount: number;
  userEmail?: string | null;
}) => {
  const customerLabel = input.userEmail ? `\nCliente: ${input.userEmail}` : "";

  return [
    "Pedido aprovado no Mercado Pago.",
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
