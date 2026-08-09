"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface GradeScale {
  id?: string;
  grade: string;
  description: string;
  minScore: number;
  maxScore: number;
}

interface ModernExecutiveReportCardProps {
  report?: any;
  school?: any;
  remarks?: any[];
  gradingSystem?: {
    gradeScales: GradeScale[];
  } | null;
  sampleMode?: boolean;
}

// ─── Default Generic Sample Data for Previews ────────────────────────────────

const DEFAULT_SAMPLE_SCHOOL = {
  name: "Sample International School",
  address: "123 Education Way | P. O. Box 100",
  motto: "Knowledge & Excellence",
  logo: null,
  headmasterName: "Head Teacher",
};

const DEFAULT_SAMPLE_STUDENT = {
  profile: {
    firstName: "Nana Yaa",
    lastName: "Owusu",
    gender: "Female",
    user: { image: null },
  },
  studentId: "SCH/2026/0142",
  class: { name: "JHS 2 Gold" },
};

const DEFAULT_SAMPLE_SUBJECTS = [
  { subjectName: "English Language", classWorkScore: 26, examScore: 61, totalScore: 87, grade: "1", position: "2nd", remarks: "Excellent" },
  { subjectName: "Mathematics", classWorkScore: 24, examScore: 58, totalScore: 82, grade: "2", position: "4th", remarks: "Very Good" },
  { subjectName: "Integrated Science", classWorkScore: 27, examScore: 64, totalScore: 91, grade: "1", position: "1st", remarks: "Excellent" },
  { subjectName: "Social Studies", classWorkScore: 23, examScore: 55, totalScore: 78, grade: "2", position: "5th", remarks: "Very Good" },
  { subjectName: "Religious & Moral Ed.", classWorkScore: 25, examScore: 57, totalScore: 82, grade: "2", position: "3rd", remarks: "Very Good" },
  { subjectName: "Ghanaian Language", classWorkScore: 22, examScore: 50, totalScore: 72, grade: "3", position: "6th", remarks: "Good" },
  { subjectName: "French", classWorkScore: 20, examScore: 46, totalScore: 66, grade: "4", position: "8th", remarks: "Good" },
  { subjectName: "Computing (ICT)", classWorkScore: 27, examScore: 60, totalScore: 87, grade: "1", position: "2nd", remarks: "Excellent" },
  { subjectName: "Career Technology", classWorkScore: 24, examScore: 52, totalScore: 76, grade: "3", position: "4th", remarks: "Good" },
  { subjectName: "Creative Arts & Design", classWorkScore: 26, examScore: 56, totalScore: 82, grade: "2", position: "3rd", remarks: "Very Good" },
];

const DEFAULT_SAMPLE_CONDUCT = [
  { label: "Punctuality", rating: 5 },
  { label: "Attentiveness", rating: 4 },
  { label: "Neatness", rating: 5 },
  { label: "Cooperation with Others", rating: 4 },
  { label: "Leadership Qualities", rating: 5 },
  { label: "Respect for Authority", rating: 5 },
];

const DEFAULT_GRADE_SCALES: GradeScale[] = [
  { grade: "1", description: "Excellent", minScore: 80, maxScore: 100 },
  { grade: "2", description: "Very Good", minScore: 70, maxScore: 79 },
  { grade: "3", description: "Good", minScore: 60, maxScore: 69 },
  { grade: "4", description: "Credit", minScore: 50, maxScore: 59 },
  { grade: "5–6", description: "Pass", minScore: 40, maxScore: 49 },
  { grade: "7–9", description: "Below Average", minScore: 0, maxScore: 39 },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= count
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-300"
          )}
        />
      ))}
    </div>
  );
}

function lookupGrade(score: number, scales: GradeScale[]) {
  const sorted = [...scales].sort((a, b) => b.minScore - a.minScore);
  for (const s of sorted) {
    if (score >= s.minScore && score <= s.maxScore) {
      return { grade: s.grade, description: s.description };
    }
  }
  return { grade: "—", description: "—" };
}

export function ModernExecutiveReportCard({
  report,
  school,
  remarks = [],
  gradingSystem,
  sampleMode = false,
}: ModernExecutiveReportCardProps) {
  const schoolData = school || DEFAULT_SAMPLE_SCHOOL;
  const reportData = report?.data || {};
  const student = report?.student || DEFAULT_SAMPLE_STUDENT;
  const set = report?.set || {};
  
  const scales = gradingSystem?.gradeScales?.length
    ? gradingSystem.gradeScales
    : DEFAULT_GRADE_SCALES;

  const academicYearName = set?.academicYear?.name || reportData?.academicYear || "2025/2026";
  const termName = set?.term?.name || reportData?.term || "Second Term";
  const dateIssued = reportData?.dateIssued || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const studentName = student.profile
    ? `${student.profile.firstName} ${student.profile.otherNames ?? ""} ${student.profile.lastName}`.trim()
    : "Nana Yaa Owusu";

  const studentId = student.studentId || reportData?.studentId || "SCH/2026/0142";
  const className = reportData?.class || student.class?.name || "JHS 2 Gold";
  const gender = student.profile?.gender || reportData?.gender || "Female";
  const numberOnRoll = reportData?.classCount || reportData?.numberOnRoll || "42";
  const attendance = reportData?.attendance || "58 / 60";
  const position = reportData?.position ? `${reportData.position}${reportData.positionSuffix || "th"}` : "3rd";
  const promotedTo = reportData?.promotedTo || "JHS 3";

  const subjects: any[] = (reportData?.subjects && reportData.subjects.length > 0)
    ? reportData.subjects
    : DEFAULT_SAMPLE_SUBJECTS;

  const grandTotal = subjects.reduce((sum, s) => {
    const sc = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
    return sum + sc;
  }, 0);

  const average = subjects.length > 0 ? (grandTotal / subjects.length).toFixed(1) : "0.0";

  const numericGrades = subjects.map((s) => {
    const score = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
    const gi = scales.length > 0 ? lookupGrade(score, scales) : { grade: s.grade ?? "", description: s.remarks || "" };
    const num = parseInt(String(gi.grade), 10);
    return isNaN(num) ? parseInt(String(s.grade), 10) : num;
  }).filter((g) => !isNaN(g));

  const aggregateScore = numericGrades.length > 0
    ? numericGrades.sort((a, b) => a - b).slice(0, 6).reduce((sum, g) => sum + g, 0)
    : (reportData?.aggregate || "1.9");

  const conductRatings = reportData?.conductRatings || DEFAULT_SAMPLE_CONDUCT;

  const generalRemark = remarks.find((r) => r.remarkType === "GENERAL")?.content
    || reportData?.behavioral?.general
    || reportData?.classTeacherRemark
    || "Nana Yaa has had an outstanding term, showing consistent effort and curiosity across all subjects, especially the sciences. She should keep up the excellent reading habit and continue supporting classmates during group work.";

  const headmasterRemark = remarks.find((r) => r.remarkType === "HEADTEACHER")?.content
    || reportData?.headmasterRemark
    || "A commendable result. Keep working hard and aim even higher next term.";

  const classTeacherName = reportData?.classTeacherName || "Class Teacher";
  const headmasterName = reportData?.headmasterName || schoolData?.headmasterName || "Head Teacher";

  return (
    <div className="print-report-wrapper flex justify-center p-2 md:p-6 bg-slate-200 dark:bg-slate-900 min-h-screen print:bg-white print:p-0 print:min-h-0 print:block font-sans">
      <div
        id="report-card-page"
        className="w-full max-w-4xl bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none border border-slate-300"
      >
        {/* ── Top Dark Navy Pill Header ── */}
        <div className="bg-[#0b192c] text-white p-5 md:p-6 rounded-t-2xl relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left: Logo & School Info */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full border-4 border-amber-400 bg-amber-400 flex items-center justify-center text-slate-950 font-black text-xl md:text-2xl shrink-0 shadow-md">
                {schoolData.logo ? (
                  <Image
                    src={schoolData.logo}
                    alt={schoolData.name}
                    width={80}
                    height={80}
                    className="object-contain h-full w-full rounded-full"
                  />
                ) : (
                  <span>
                    {schoolData.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 3) || "SCH"}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                  {schoolData.name}
                </h1>
                {schoolData.address && (
                  <p className="text-xs text-slate-300 mt-0.5">
                    {schoolData.address} {schoolData.motto ? `| "${schoolData.motto}"` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Badge & Term/Year */}
            <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
              <div className="bg-amber-400 text-slate-950 px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest shadow-sm">
                TERMINAL REPORT
              </div>
              <p className="text-xs text-slate-300 font-semibold">
                {termName} &bull; {academicYearName} Academic Year
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* ── Student Information Grid ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col md:flex-row gap-5 items-center md:items-start">
            {/* Student Photo */}
            <div className="w-24 h-28 rounded-xl border-2 border-amber-400 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {student.profile?.user?.image || reportData?.studentImage ? (
                <img
                  src={student.profile?.user?.image || reportData?.studentImage}
                  alt="Student Photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 flex-1 text-xs w-full">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{studentName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</span>
                <span className="font-bold text-slate-900 text-sm">{className}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID</span>
                <span className="font-bold text-slate-800">{studentId}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                <span className="font-bold text-slate-800">{gender}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Number on Roll</span>
                <span className="font-bold text-slate-800">{numberOnRoll}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
                <span className="font-bold text-slate-800">{attendance}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Position</span>
                <span className="font-extrabold text-indigo-700">{position}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promoted To</span>
                <span className="font-bold text-slate-800">{promotedTo}</span>
              </div>
            </div>
          </div>

          {/* ── Academic Performance Table ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">
                Academic Performance
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0b192c] text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3 text-center">Class Score (30)</th>
                    <th className="py-2.5 px-3 text-center">Exam Score (70)</th>
                    <th className="py-2.5 px-3 text-center">Total (100)</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Position</th>
                    <th className="py-2.5 px-3 text-left">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subjects.map((sub: any, idx: number) => {
                    const total = typeof sub.totalScore === "number" ? sub.totalScore : parseFloat(sub.totalScore) || 0;
                    const cScore = typeof sub.classWorkScore === "number" ? sub.classWorkScore : parseFloat(sub.classWorkScore) || 0;
                    const eScore = typeof sub.examScore === "number" ? sub.examScore : parseFloat(sub.examScore) || 0;
                    const gi = scales.length > 0 ? lookupGrade(total, scales) : { grade: sub.grade || "—", description: sub.remarks || "—" };

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="py-2 px-3 font-bold text-slate-900">{sub.subjectName}</td>
                        <td className="py-2 px-3 text-center text-slate-700 font-medium">{cScore}</td>
                        <td className="py-2 px-3 text-center text-slate-700 font-medium">{eScore}</td>
                        <td className="py-2 px-3 text-center font-black text-slate-900">{total}</td>
                        <td className="py-2 px-3 text-center font-black text-emerald-700">{gi.grade || sub.grade}</td>
                        <td className="py-2 px-3 text-center text-slate-700">{sub.position || "—"}</td>
                        <td className="py-2 px-3 font-medium text-slate-700">{gi.description || sub.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="block text-xl md:text-2xl font-black text-slate-900">{grandTotal}</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Score</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="block text-xl md:text-2xl font-black text-slate-900">{average}</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Average</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="block text-xl md:text-2xl font-black text-emerald-700">{aggregateScore}</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Aggregate</span>
              </div>
            </div>
          </section>

          {/* ── Conduct & Remarks Section ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Conduct & Interests + Grade Key */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">
                  Conduct & Interests
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 space-y-2.5 text-xs">
                {conductRatings.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <StarRating count={item.rating || 5} />
                  </div>
                ))}
              </div>

              {/* Grade Key Legend */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[10px] text-slate-600 leading-relaxed">
                <span className="font-black text-slate-900 uppercase">Grade Key: </span>
                {scales.map((s, idx) => (
                  <span key={idx}>
                    <span className="font-bold text-slate-900">{s.grade}</span> = {s.description} ({s.minScore}–{s.maxScore})
                    {idx < scales.length - 1 ? " • " : ""}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Remarks & Signatures */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">
                  Remarks
                </h2>
              </div>

              <div className="space-y-4">
                {/* Class Teacher Remark */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class Teacher's Remark</span>
                  <p className="text-xs italic text-slate-800 leading-relaxed">
                    "{generalRemark}"
                  </p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{classTeacherName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Signature</span>
                  </div>
                </div>

                {/* Head Teacher Remark */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Head Teacher's Remark</span>
                  <p className="text-xs italic text-slate-800 leading-relaxed">
                    "{headmasterRemark}"
                  </p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{headmasterName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Banner ── */}
        <div className="bg-[#0b192c] text-white p-4 rounded-b-2xl flex flex-col md:flex-row items-center justify-between text-xs gap-2">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">Academic Year</span>
            <span className="font-bold">{academicYearName}</span>
          </div>
          <div className="text-center">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">Term</span>
            <span className="font-bold">{termName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-bold">Date Issued</span>
            <span className="font-bold">{dateIssued}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
