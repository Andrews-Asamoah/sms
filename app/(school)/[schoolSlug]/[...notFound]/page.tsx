// @/school/[schoolSlug]/[...notFound]/page.tsx
import { notFound } from "next/navigation";

export default function SchoolCatchAllNotFound() {
  notFound();
}
