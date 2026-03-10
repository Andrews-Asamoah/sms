/**
 * Utility to format a student's full name according to school standards.
 * Required Format: Surname, Firstname Othername (e.g. Asamoah Andrews Kwaku)
 *
 * @param firstName 
 * @param lastName 
 * @param otherNames 
 * @returns formatted string
 */
export function formatStudentName(
  firstName?: string | null,
  lastName?: string | null,
  otherNames?: string | null,
) {
  const first = firstName || "";
  const last = lastName || "";
  const other = otherNames ? ` ${otherNames}` : "";

  return `${last}, ${first}${other}`.trim().replace(/^, | ,$/g, "");
}
