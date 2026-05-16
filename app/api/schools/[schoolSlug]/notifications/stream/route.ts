// app/api/schools/[schoolSlug]/notifications/stream/route.ts

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";

export const runtime = "nodejs"; // Edge doesn't support Prisma; use nodejs + streaming
const POLL_INTERVAL_MS = 30_000;
const KEEPALIVE_INTERVAL_MS = 25_000;

function buildRoleFilter(role: string) {
  if (role === "guardian") {
    return {
      in: [
        "FEE_REMINDER",
        "ONLINE_PAYMENT",
        "ANNOUNCEMENT",
        "RESULT_PUBLISHED",
        "GENERAL",
      ],
    };
  }
  if (role === "teacher") {
    return { in: ["GENERAL", "ANNOUNCEMENT", "ATTENDANCE_ALERT"] };
  }
  return undefined; // no filter for admin/owner/accountant etc.
}

async function fetchNotifications(
  schoolId: string,
  userId: string,
  role: string,
) {
  const where: Record<string, unknown> = { schoolId, userId };
  const typeFilter = buildRoleFilter(role);
  if (typeFilter) where.type = typeFilter;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return { notifications, unreadCount };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;

  // ── Authenticate once at connection time ──────────────────────────────────
  let session: Awaited<ReturnType<typeof requireSchoolAccess>>;
  let school: { id: string } | null;
  let role: string;

  try {
    session = await requireSchoolAccess(schoolSlug);
    school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });
    if (!school) {
      return new Response("School not found", { status: 404 });
    }
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    role = activeRole?.effectiveRole ?? "user";
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const schoolId = school.id;

  // ── Build SSE stream ──────────────────────────────────────────────────────
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // controller may already be closed
        }
      }

      function sendKeepalive() {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // ignore
        }
      }

      // Send initial snapshot immediately so the UI renders without waiting 30 s
      try {
        const initial = await fetchNotifications(schoolId, userId, role);
        send("notifications", initial);
      } catch (err) {
        console.error("[SSE] Initial fetch failed:", err);
      }

      // Poll for updates every POLL_INTERVAL_MS
      pollTimer = setInterval(async () => {
        if (isClosed) return;
        try {
          const data = await fetchNotifications(schoolId, userId, role);
          send("notifications", data);
        } catch (err) {
          console.error("[SSE] Poll failed:", err);
        }
      }, POLL_INTERVAL_MS);

      // Keep the connection alive
      keepaliveTimer = setInterval(sendKeepalive, KEEPALIVE_INTERVAL_MS);

      // Detect client disconnect via the AbortSignal
      request.signal?.addEventListener("abort", () => {
        isClosed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },

    cancel() {
      isClosed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (keepaliveTimer) clearInterval(keepaliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx/proxy buffering
    },
  });
}
