import { Metadata } from "next";
import { AnnouncementsPageContent } from "@/components/school/announcements-page";

export const metadata: Metadata = {
  title: "Announcements",
  description: "School updates and news",
};

export default function AccountantAnnouncementsPage() {
  return <AnnouncementsPageContent />;
}
