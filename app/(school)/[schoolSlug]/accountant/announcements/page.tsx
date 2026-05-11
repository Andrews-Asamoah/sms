import { Metadata } from "next";
import { AnnouncementsPageContent } from "@/components/school/announcements-page";

export const metadata: Metadata = {
  title: "Announcements",
  description: "View and send school announcements and financial messages to parents.",
};

export default function AccountantAnnouncementsPage() {
  return (
    <AnnouncementsPageContent
      canManage={true}
      canSendExternal={true}
      showFinancialMessage={true}
    />
  );
}
