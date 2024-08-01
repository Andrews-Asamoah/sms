-- DropForeignKey
ALTER TABLE "Term" DROP CONSTRAINT "Term_academicYearName_fkey";

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearName_fkey" FOREIGN KEY ("academicYearName") REFERENCES "AcademicYear"("name") ON DELETE CASCADE ON UPDATE CASCADE;
