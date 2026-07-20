// app/(system)/communications/history/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Broadcast History | Communications",
  description: "View all system SMS broadcast history",
};

export const dynamic = "force-dynamic";

function getStatusBadge(status: string) {
  switch (status) {
    case "SENT":
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Sent
        </Badge>
      );
    case "PARTIAL":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 gap-1">
          <AlertCircle className="h-3 w-3" /> Partial
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="bg-red-500/10 text-red-700 border-red-500/30 gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default async function BroadcastHistoryPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/auth/login");

  const logs = await prisma.systemSMSLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalSent = logs.reduce(
    (a, l) => a + (l.status !== "FAILED" ? l.recipientCount - l.failedCount : 0),
    0
  );
  const totalFailed = logs.reduce((a, l) => a + l.failedCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-md">
              <History className="h-5 w-5 text-white" />
            </div>
            Broadcast History
          </h1>
          <p className="text-muted-foreground ml-[52px]">
            All SMS broadcasts sent from the system portal
          </p>
        </div>
        <Button asChild>
          <Link href="/communications" className="gap-2">
            <Radio className="h-4 w-4" />
            New Broadcast
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Broadcasts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalSent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Failed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{totalFailed.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Broadcasts</CardTitle>
          <CardDescription>Last 100 system-wide SMS broadcasts</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Radio className="h-12 w-12 text-muted-foreground/20" />
              <p className="text-muted-foreground">No broadcasts sent yet.</p>
              <Button asChild variant="outline">
                <Link href="/communications">Send your first broadcast</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Message</th>
                    <th className="pb-3 pr-4 font-medium">Target</th>
                    <th className="pb-3 pr-4 font-medium">Recipients</th>
                    <th className="pb-3 pr-4 font-medium">Failed</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-4 text-sm tabular-nums whitespace-nowrap text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <br />
                        <span className="text-xs">
                          {new Date(log.createdAt).toLocaleTimeString("en-GH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm max-w-xs">
                        <p className="line-clamp-2">{log.message}</p>
                        {log.batchId && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {log.batchId}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="capitalize text-xs">
                          {log.targetFilter}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-sm font-medium">
                        {log.recipientCount.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-sm">
                        {log.failedCount > 0 ? (
                          <span className="text-red-600 font-medium">
                            {log.failedCount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">{getStatusBadge(log.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
