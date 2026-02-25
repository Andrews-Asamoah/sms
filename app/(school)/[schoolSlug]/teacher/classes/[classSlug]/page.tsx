import { redirect } from "next/navigation";

interface ClassPageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
}

export default async function TeacherClassPage({ params }: ClassPageProps) {
  const { schoolSlug, classSlug } = await params;

  // Default action when clicking a class is to see its students
  redirect(`/${schoolSlug}/teacher/classes/${classSlug}/students`);
}
