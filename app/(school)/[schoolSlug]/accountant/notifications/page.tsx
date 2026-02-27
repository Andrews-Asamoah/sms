import { Metadata } from "next";
import { NotificationsPageContent } from "@/components/school/notifications-page";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View your alerts and news",
};

export default function AccountantNotificationsPage() {
  return <NotificationsPageContent />;
}
