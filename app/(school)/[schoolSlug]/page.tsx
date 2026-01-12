// app/(school)/[schoolSlug]/page.tsx
import { redirect } from "next/navigation";

interface Props {
  params: { schoolSlug: string };
}

export default function SchoolIndexPage({ params }: Props) {
  redirect(`/${params.schoolSlug}/admin/dashboard`);
}
