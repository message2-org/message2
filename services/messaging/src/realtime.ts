import { WebSocket } from "ws";

const sockets = new Map<WebSocket, string>();

export const registerSocket = (socket: WebSocket, userId: string) => {
  sockets.set(socket, userId);
};

export const unregisterSocket = (socket: WebSocket) => {
  sockets.delete(socket);
};

export const broadcastToUsers = (userIds: Iterable<string>, payload: unknown) => {
  const targets = new Set(userIds);
  const body = JSON.stringify(payload);
  for (const [socket, userId] of sockets) {
    if (targets.has(userId) && socket.readyState === WebSocket.OPEN) {
      socket.send(body);
    }
  }
};
