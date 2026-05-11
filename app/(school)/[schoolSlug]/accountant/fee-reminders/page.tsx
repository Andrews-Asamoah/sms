import { Metadata } from "next";
import { FeeReminderScheduler } from "@/components/school/fee-reminder-scheduler";

export const metadata: Metadata = {
  title: "Fee Reminder Schedules",
  description: "Manage automated fee reminder schedules for parents with outstanding balances.",
};

export default function AccountantFeeRemindersPage() {
  return <FeeReminderScheduler />;
}
