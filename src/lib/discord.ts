import { REST } from "@discordjs/rest";
import { ChannelType, PermissionFlagsBits, type APIChannel } from "discord.js";
import { Routes } from "discord-api-types/v10";

const getDiscordToken = () => process.env.DISCORD_BOT_TOKEN;
const getNotificationChannelId = () => process.env.DISCORD_NOTIFICATION_CHANNEL_ID;
const getTicketChannelId = () => process.env.DISCORD_TICKET_CHANNEL_ID || getNotificationChannelId();
const getGuildId = () => process.env.DISCORD_GUILD_ID;
const getStaffRoleId = () => process.env.DISCORD_STAFF_ROLE_ID;

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

type DiscordOverwrite = {
  id: string;
  type: 0 | 1;
  allow: string;
  deny: string;
};

let cachedBotUserId: string | null = null;

const getBotUserId = async (): Promise<string> => {
  if (cachedBotUserId) {
    return cachedBotUserId;
  }

  const botUser = (await createRestClient().get("/users/@me")) as { id?: string };

  if (!botUser?.id) {
    throw new Error("Could not resolve Discord bot user id");
  }

  cachedBotUserId = botUser.id;
  return botUser.id;
};

type DiscordChannelMessage = {
  id: string;
  channel_id: string;
};

type DiscordTicketTarget = {
  messageId: string | null;
  threadId: string;
  threadUrl: string | null;
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
  console.log("[Discord] Iniciando criação de ticket para ordem:", input.orderId);
  
  const channelId = getTicketChannelId();

  if (!channelId) {
    console.error("[Discord] ERRO: DISCORD_TICKET_CHANNEL_ID não configurado. Verifique as variáveis de ambiente DISCORD_TICKET_CHANNEL_ID ou DISCORD_NOTIFICATION_CHANNEL_ID.");
    return null;
  }

  try {
    console.log("[Discord] Buscando channel com ID:", channelId);
    const channel = (await createRestClient().get(Routes.channel(channelId))) as APIChannel & {
      type?: number;
    };

    console.log("[Discord] Channel encontrado, tipo:", channel.type);
    
    const messageContent = buildOrderPaidMessage({
      orderId: input.orderId,
      productTitle: input.productTitle,
      amount: input.amount,
      mention: input.mention || null,
      userEmail: input.userEmail || null,
      providerLabel: input.providerLabel || null,
    });

    const clientId = extractClientIdFromMention(input.mention);
    console.log("[Discord] Mention string recebida:", input.mention);
    console.log("[Discord] Client ID extraído:", clientId);
    if (!clientId) {
      console.warn("[Discord] Nenhum discordId encontrado para o cliente; ticket será criado sem acesso direto do cliente.");
    }

    const ticketName = `pedido-${input.orderId.slice(0, 8)}`;
    const existingTicket = await findExistingTicketByName({
      channelId,
      channelType: channel.type,
      guildId: getGuildId(),
      ticketName,
      clientId,
    });

    if (existingTicket) {
      console.log("[Discord] Ticket existente encontrado; reutilizando:", existingTicket.threadId);
      return existingTicket;
    }

    // Forum channel (type 15)
    if (channel.type === ChannelType.GuildForum) {
      console.log("[Discord] Criando thread privada no forum...");
      const thread = (await createRestClient().post(Routes.threads(channelId), {
        body: {
          name: ticketName,
          auto_archive_duration: 1440,
          message: {
            content: messageContent,
          },
        },
      })) as { id?: string };

      console.log("[Discord] Thread criada com sucesso:", thread.id);

      if (!thread?.id) {
        console.error("[Discord] ERRO: Thread não retornou ID");
        return null;
      }

      if (clientId) {
        try {
          await addThreadMember(thread.id, clientId);
        } catch (err) {
          console.warn('[Discord] Falha ao adicionar cliente à thread (continuando):', err instanceof Error ? err.message : err);
        }
      }

      const guildId = getGuildId();
      const threadUrl = guildId ? `https://discord.com/channels/${guildId}/${thread.id}` : null;
      console.log("[Discord] URL do ticket:", threadUrl);
      
      return {
        messageId: null,
        threadId: thread.id,
        threadUrl,
      };
    }

    // Text channel (type 0) - criar canal privado real
    if (channel.type === ChannelType.GuildText) {
      console.log("[Discord] Criando canal de texto privado...");

      const guildId = getGuildId();
      console.log("[Discord] Guild ID:", guildId);
      
      if (!guildId) {
        console.error("[Discord] ERRO: DISCORD_GUILD_ID é obrigatório quando usando Text Channel para tickets. Configure a variável de ambiente DISCORD_GUILD_ID.");
        return null;
      }
      
      const botUserId = await getBotUserId();
      const permissionOverwrites: DiscordOverwrite[] = [
        {
          id: guildId,
          type: 0,
          allow: "0",
          deny: PermissionFlagsBits.ViewChannel.toString(),
        },
        {
          id: botUserId,
          type: 1,
          allow:
            (
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory |
              PermissionFlagsBits.ManageMessages
            ).toString(),
          deny: "0",
        },
      ];

      if (clientId) {
        permissionOverwrites.push({
          id: clientId,
          type: 1,
          allow:
            (
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory
            ).toString(),
          deny: "0",
        });
      }

      const staffRoleId = getStaffRoleId();

      if (staffRoleId) {
        permissionOverwrites.push({
          id: staffRoleId,
          type: 0,
          allow:
            (
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory |
              PermissionFlagsBits.ManageMessages
            ).toString(),
          deny: "0",
        });
      }

      let ticketChannel: { id?: string } | null = null;
      try {
        const payload = {
          name: ticketName,
          type: ChannelType.GuildText,
          permission_overwrites: permissionOverwrites,
          topic: `Ticket privado do pedido ${input.orderId}`,
        };

        console.log("[Discord] Payload para criação de canal privado:", JSON.stringify({ name: payload.name, type: payload.type, topic: payload.topic }));

        ticketChannel = (await createRestClient().post(`/guilds/${guildId}/channels`, {
          body: payload,
        })) as { id?: string };

        console.log("[Discord] Resposta criação de canal (raw):", ticketChannel);

        if (!ticketChannel?.id) {
          console.error("[Discord] ERRO: Canal privado não retornou ID");
          return null;
        }

        console.log("[Discord] Canal privado criado com sucesso:", ticketChannel.id);
      } catch (err) {
        console.error('[Discord] Erro ao criar canal privado:', err instanceof Error ? err.message : err);
        try {
          // tenta extrair detalhes do erro quando possível
          const json = JSON.parse(String(err instanceof Error ? err.message : String(err)));
          console.error('[Discord] Detalhes do erro API:', json);
        } catch (_) {
          // ignore parse error
        }

        return null;
      }

      // Enviar mensagem no canal privado
      let msg: { id?: string } | null = null;
      try {
        msg = (await createRestClient().post(Routes.channelMessages(ticketChannel.id), {
          body: {
            content: messageContent,
          },
        })) as { id?: string };

        console.log("[Discord] Mensagem enviada no canal privado:", msg.id);
      } catch (err) {
        console.error('[Discord] Erro ao enviar mensagem no canal privado:', err instanceof Error ? err.message : err);
      }

      const threadUrl = guildId ? `https://discord.com/channels/${guildId}/${ticketChannel.id}` : null;
      console.log("[Discord] URL do ticket privado:", threadUrl);
      
      return {
        messageId: msg?.id || null,
        threadId: ticketChannel.id,
        threadUrl,
      };
    }

    throw new Error(`DISCORD_TICKET_CHANNEL_ID deve apontar para um Text Channel (tipo 0) ou Forum Channel (tipo 15). Tipo encontrado: ${channel.type}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Discord] ERRO ao criar ticket:", errorMessage);
    
    if (errorMessage.includes("Missing Permissions")) {
      console.error("[Discord] 💡 Solução: O bot não tem permissão para criar canais. Verifique as permissões do bot no Discord.");
    }
    
    return null;
  }
};

const findExistingTicketByName = async (input: {
  channelId: string;
  channelType?: number;
  guildId?: string;
  ticketName: string;
  clientId?: string | null;
}): Promise<DiscordTicketTarget | null> => {
  try {
    if (input.channelType === ChannelType.GuildForum) {
      const thread = await findForumThreadByName({
        channelId: input.channelId,
        guildId: input.guildId,
        ticketName: input.ticketName,
      });

      if (!thread?.id) {
        return null;
      }

      if (input.clientId) {
        await addThreadMember(thread.id, input.clientId);
      }

      return {
        messageId: null,
        threadId: thread.id,
        threadUrl: input.guildId ? `https://discord.com/channels/${input.guildId}/${thread.id}` : null,
      };
    }

    if (input.channelType === ChannelType.GuildText && input.guildId) {
      const channels = (await createRestClient().get(`/guilds/${input.guildId}/channels`)) as Array<{
        id?: string;
        name?: string;
        type?: number;
      }>;

      const channel = channels.find((candidate) => {
        return candidate.type === ChannelType.GuildText && isSameDiscordName(candidate.name, input.ticketName);
      });

      if (!channel?.id) {
        return null;
      }

      return {
        messageId: null,
        threadId: channel.id,
        threadUrl: `https://discord.com/channels/${input.guildId}/${channel.id}`,
      };
    }
  } catch (err) {
    console.warn("[Discord] Falha ao buscar ticket existente:", err instanceof Error ? err.message : err);
  }

  return null;
};

const findForumThreadByName = async (input: {
  channelId: string;
  guildId?: string;
  ticketName: string;
}): Promise<{ id?: string; name?: string } | null> => {
  const endpoints: Array<{ url: `/${string}`; filterByParent: boolean }> = [
    ...(input.guildId ? [{ url: `/guilds/${input.guildId}/threads/active` as `/${string}`, filterByParent: true }] : []),
    { url: `/channels/${input.channelId}/threads/archived/public?limit=100`, filterByParent: false },
    { url: `/channels/${input.channelId}/threads/archived/private?limit=100`, filterByParent: false },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = (await createRestClient().get(endpoint.url)) as {
        threads?: Array<{ id?: string; name?: string; parent_id?: string }>;
      };
      const thread = response.threads?.find((candidate) => {
        const isSameParent = !endpoint.filterByParent || candidate.parent_id === input.channelId;
        return isSameParent && isSameDiscordName(candidate.name, input.ticketName);
      });

      if (thread?.id) {
        return thread;
      }
    } catch (err) {
      console.warn("[Discord] Falha ao consultar threads do forum:", endpoint.url, err instanceof Error ? err.message : err);
    }
  }

  return null;
};

const normalizeDiscordName = (name?: string | null) => {
  return (name || "").trim().toLowerCase();
};

const isSameDiscordName = (actualName: string | undefined, expectedName: string) => {
  return normalizeDiscordName(actualName) === normalizeDiscordName(expectedName);
};

const extractClientIdFromMention = (clientMentionStr?: string | null): string | null => {
  if (!clientMentionStr) {
    return null;
  }

  const clientIdMatch = clientMentionStr.match(/<@(\d+)>/);

  return clientIdMatch?.[1] || null;
};

const addThreadMember = async (threadId: string, clientId: string): Promise<void> => {
  try {
    await createRestClient().put(`/channels/${threadId}/thread-members/${clientId}`);
    console.log("[Discord] Cliente adicionado à thread:", clientId);
  } catch (err) {
    console.warn("[Discord] Erro ao adicionar cliente à thread:", err instanceof Error ? err.message : err);
  }
};

export const archiveThread = async (threadId?: string | null) => {
  if (!threadId) return false;
  try {
    await createRestClient().delete(Routes.channel(threadId));
    return true;
  } catch (err) {
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
    })) as { url?: string; code?: string } | null;

    // Discord may return either a full url or a code
    if (!invite) return null;

    if (invite.url) return invite.url as string;
    if (invite.code) return `https://discord.gg/${invite.code}`;

    return null;
  } catch (err) {
    console.warn("Failed to create invite:", err);
    return null;
  }
};
