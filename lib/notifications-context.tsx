// lib/notifications-context.tsx
// Single SSE connection per logged-in user.
// Both NotificationBell and NotificationsPageContent consume this context
// instead of each making their own fetch/poll calls.
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsState>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  markRead: () => {},
  markAllRead: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({
  children,
  schoolSlug,
}: {
  children: ReactNode;
  schoolSlug: string;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Keep an ES ref so the cleanup function always has the current EventSource
  const esRef = useRef<EventSource | null>(null);

  // ── Connect to SSE stream ─────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolSlug) return;

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      // Clean up any previous connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource(
        `/api/schools/${schoolSlug}/notifications/stream`,
      );
      esRef.current = es;

      es.addEventListener("notifications", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as {
            notifications: AppNotification[];
            unreadCount: number;
          };
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          setIsConnected(true);
        } catch {
          // malformed data — ignore
        }
      });

      es.onopen = () => setIsConnected(true);

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        esRef.current = null;
        // Exponential back-off: retry after 10 s to avoid hammering the server
        retryTimeout = setTimeout(connect, 10_000);
      };
    }

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
    };
  }, [schoolSlug]);

  // ── Optimistic mark-as-read ───────────────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update — immediate UI response
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/schools/${schoolSlug}/notifications`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: id }),
        });
      } catch {
        // Revert on failure — SSE will correct state on next push anyway
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [schoolSlug],
  );

  // ── Optimistic mark-all-read ──────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch(`/api/schools/${schoolSlug}/notifications`, {
        method: "PUT",
      });
    } catch {
      // SSE will re-sync on next poll
    }
  }, [schoolSlug]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, isConnected, markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useContext(NotificationsContext);
}
