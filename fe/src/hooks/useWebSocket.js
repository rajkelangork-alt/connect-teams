import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useWebSocket(channelId, onEvent) {
  const { token } = useAuth() || {};
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);

  const connect = useCallback(() => {
    // If not authenticated or has failed repeatedly (403 Forbidden), do not spam
    if (!token || !channelId || consecutiveFailuresRef.current >= 3) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const wsUrl = `${protocol}//${host}:8000/ws/channels/${channelId}?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onEvent) onEvent(data);
        } catch {}
      };

      ws.onopen = () => {
        consecutiveFailuresRef.current = 0;
      };

      ws.onerror = () => {
        consecutiveFailuresRef.current += 1;
      };

      ws.onclose = (event) => {
        // Stop reconnecting immediately on 403 Forbidden or authentication rejection
        if (event.code === 4403 || event.code === 403 || consecutiveFailuresRef.current >= 3) {
          return;
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch {}
  }, [channelId, token, onEvent]);

  useEffect(() => {
    consecutiveFailuresRef.current = 0;
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendTyping = useCallback(
    (userName) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: 'typing',
              user_name: userName,
              channel_id: channelId,
            })
          );
        } catch {}
      }
    },
    [channelId]
  );

  return { sendTyping };
}