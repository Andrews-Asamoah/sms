import { redirect } from "next/navigation";

interface ExamsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ExamsPage(props: ExamsPageProps) {
  const { schoolSlug } = await props.params;
  redirect(`/${schoolSlug}/admin/academics/grading/assessment-templates`);
}

