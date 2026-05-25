import { WebSocket } from "ws";

const sockets = new Map<WebSocket, string>();
const connectionCountByUser = new Map<string, number>();

export const registerSocket = (socket: WebSocket, userId: string) => {
  sockets.set(socket, userId);
  connectionCountByUser.set(userId, (connectionCountByUser.get(userId) ?? 0) + 1);
};

export const unregisterSocket = (socket: WebSocket) => {
  const userId = sockets.get(socket);
  sockets.delete(socket);
  if (!userId) return;
  const next = (connectionCountByUser.get(userId) ?? 1) - 1;
  if (next <= 0) {
    connectionCountByUser.delete(userId);
  } else {
    connectionCountByUser.set(userId, next);
  }
};

export const isUserConnected = (userId: string) => (connectionCountByUser.get(userId) ?? 0) > 0;

export const getConnectedUserIds = () => [...connectionCountByUser.keys()];

export const getUserIdForSocket = (socket: WebSocket) => sockets.get(socket);

export const broadcastToUsers = (userIds: Iterable<string>, payload: unknown) => {
  const targets = new Set(userIds);
  const body = JSON.stringify(payload);
  for (const [socket, userId] of sockets) {
    if (targets.has(userId) && socket.readyState === WebSocket.OPEN) {
      socket.send(body);
    }
  }
};
