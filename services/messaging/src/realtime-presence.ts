import type { PrismaClient } from "@prisma/client";
import { broadcastToUsers, getConnectedUserIds, isUserConnected } from "./realtime.js";

export { isUserConnected, getConnectedUserIds };

export async function notifyPresenceForUser(
  prisma: PrismaClient,
  userId: string,
  status: "online" | "offline"
) {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true }
  });
  const chatIds = memberships.map((m) => m.chatId);
  if (chatIds.length === 0) return;

  const peers = await prisma.chatMember.findMany({
    where: { chatId: { in: chatIds }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"]
  });
  const peerIds = peers.map((p) => p.userId);
  if (peerIds.length === 0) return;

  broadcastToUsers(peerIds, {
    type: "presence.changed",
    payload: { userId, status }
  });
}
