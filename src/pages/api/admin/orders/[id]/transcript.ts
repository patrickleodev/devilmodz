import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { ensureDataSource } from "../../../../../lib/db";
import { isAdminRole } from "../../../../../lib/admin";
import { DeliveryLog } from "../../../../../entities/DeliveryLog";

type TranscriptPayload = {
  type?: string;
  source?: string;
  threadId?: string;
  closedAt?: string;
  messageCount?: number;
  transcript?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { roles?: string[] } | undefined;

  if (!isAdminRole(sessionUser?.roles)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid order id" });
  }

  const ds = await ensureDataSource();
  const logRepo = ds.getRepository(DeliveryLog);
  const logs = await logRepo.find({ where: { orderId: id }, order: { createdAt: "DESC" } });

  const transcriptLog = logs.find((log) => {
    try {
      const payload = JSON.parse(log.message) as TranscriptPayload;
      return payload.type === "ticket_transcript";
    } catch {
      return false;
    }
  });

  if (!transcriptLog) {
    return res.status(404).json({ error: "Transcript not found for this order" });
  }

  let payload: TranscriptPayload;
  try {
    payload = JSON.parse(transcriptLog.message) as TranscriptPayload;
  } catch {
    return res.status(500).json({ error: "Stored transcript is invalid" });
  }

  return res.status(200).json({
    orderId: id,
    recordedAt: transcriptLog.createdAt,
    deliveredBy: transcriptLog.deliveredBy || null,
    source: payload.source || null,
    closedAt: payload.closedAt || null,
    threadId: payload.threadId || null,
    messageCount: Number(payload.messageCount || 0),
    transcript: payload.transcript || "",
  });
}

