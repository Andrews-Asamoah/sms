"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeScale {
  id: string;
  grade: string;
  description: string;
  minScore: number;
  maxScore: number;
}

interface FormalReportCardProps {
  report: any;       // The full Prisma ReportCard with included relations
  school: any;       // The School record
  remarks: any[];    // Array of Remark records for this student+term
  gradingSystem: {  // Default GradingSystem with gradeScales
    gradeScales: GradeScale[];
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrdinalSuffix(n: number) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function lookupGrade(score: number, scales: GradeScale[]): { grade: string; description: string } {
  const sorted = [...scales].sort((a, b) => b.minScore - a.minScore);
  for (const s of sorted) {
    if (score >= s.minScore && score <= s.maxScore) {
      return { grade: s.grade, description: s.description };
    }
  }
  return { grade: "—", description: "—" };
}

function parseBehavioralRemark(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        conduct: parsed.conduct || "",
        attitude: parsed.attitude || "",
        punctuality: parsed.punctuality || "",
      };
    }
    // Legacy chip format
    if (Array.isArray(parsed)) {
      return {
        conduct: parsed.find((r: any) => r.pillar === "CONDUCT")?.value || "",
        attitude: parsed.find((r: any) => r.pillar === "ATTITUDE")?.value || "",
        punctuality: parsed.find((r: any) => r.pillar === "PUNCTUALITY")?.value || "",
      };
    }
  } catch {
    // ignore
  }
  return { conduct: "", attitude: "", punctuality: "" };
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode | null }) {
  return (
    <div className="flex text-xs border-b border-gray-200 py-1">
      <span className="w-36 font-semibold text-gray-600 shrink-0">{label}:</span>
      <span className="flex-1 font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

// ─── FormalReportCard ─────────────────────────────────────────────────────────

export function FormalReportCard({ report, school, remarks, gradingSystem }: FormalReportCardProps) {
  const data = report.data as any;
  const student = report.student;
  const set = report.set;
  const scales = gradingSystem?.gradeScales ?? [];

  const generalRemark = remarks.find((r) => r.remarkType === "GENERAL")?.content || "";
  const headteacherRemark = remarks.find((r) => r.remarkType === "HEADTEACHER")?.content || data?.headmasterRemark || "";
  const behavioralRaw = remarks.find((r) => r.remarkType === "BEHAVIORAL")?.content || "";
  const behavioral = parseBehavioralRemark(behavioralRaw);

  const subjects: any[] = data?.subjects ?? [];
  const average = data?.average ?? null;
  const position = data?.position ?? null;
  const positionSuffix = data?.positionSuffix ?? "";
  const classCount = data?.classCount ?? null;
  const attendance = data?.attendance ?? null;
  const totalScore = data?.totalScore ?? null;

  // Compute total of all subject totalScores
  const grandTotal = subjects.reduce((sum, s) => {
    const score = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
    return sum + score;
  }, 0);

  // Compute Best-6 Aggregate (sum of the 6 lowest numeric grades — lower is better in GH grading)
  const numericGrades = subjects.map((s) => {
    const score = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
    const gi = scales.length > 0 ? lookupGrade(score, scales) : { grade: s.grade ?? "", description: s.remarks || "" };
    return parseInt(String(gi.grade), 10);
  }).filter(g => !isNaN(g));
  const aggregateScore = numericGrades.length > 0
    ? numericGrades.sort((a, b) => a - b).slice(0, 6).reduce((sum, g) => sum + g, 0)
    : null;

  return (
    <div className="print-report-wrapper flex justify-center p-4 md:p-8 bg-slate-200 dark:bg-slate-800 min-h-screen print:bg-white print:p-0 print:min-h-0 print:block">
      {/* A4-ish page — force light mode colors so text is always visible on the white paper */}
      <div
        id="report-card-page"
        className="w-full max-w-3xl bg-white dark:bg-white text-black dark:text-black shadow-xl rounded-lg overflow-hidden print:shadow-none print:rounded-none"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {/* ── School Header ── */}
        <div className="border-b-4 border-blue-900 px-8 pt-6 pb-4">
          <div className="flex items-center gap-5">
            {/* Logo */}
            <div className="h-20 w-20 shrink-0 flex items-center justify-center">
              {school.logo ? (
                <Image
                  src={school.logo}
                  alt={school.name}
                  width={80}
                  height={80}
                  className="object-contain h-20 w-20"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold">
                  {school.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
              )}
            </div>

            {/* School info */}
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-black uppercase tracking-wide text-blue-900">
                {school.name}
              </h1>
              {school.address && (
                <p className="text-xs text-gray-600 mt-0.5">{school.address}</p>
              )}
              <div className="flex justify-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                {school.phone && <span>📞 {school.phone}</span>}
                {school.email && <span>✉ {school.email}</span>}
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="mt-4 py-2 bg-blue-900 text-white text-center rounded">
            <p className="text-sm font-bold uppercase tracking-widest">
              Academic Report Card
            </p>
            <p className="text-xs opacity-80">
              {set.term.name} &bull; {set.academicYear.name}
            </p>
          </div>
        </div>

        <div className="px-8 py-5 space-y-5">
          {/* ── Student Info & Photo ── */}
          <div className="flex justify-between items-start gap-6 border-b border-gray-100 pb-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 flex-1">
              <div className="space-y-0.5">
                <InfoRow label="Student Name" value={`${student.profile.firstName} ${student.profile.otherNames ?? ""} ${student.profile.lastName}`.trim()} />
                <InfoRow label="Student ID" value={student.studentId} />
                <InfoRow label="Class" value={data?.class || student.class?.name} />
                <InfoRow label="Academic Year" value={set.academicYear.name} />
              </div>
              <div className="space-y-0.5">
                <InfoRow label="Term" value={set.term.name} />
                {position && (
                  <InfoRow label="Class Position" value={
                    <span>{position}<sup>{positionSuffix}</sup> out of {classCount ?? "?"}</span>
                  } />
                )}
                {aggregateScore !== null && (
                  <InfoRow label="Aggregate (Best-6)" value={aggregateScore.toString()} />
                )}
                {attendance && (
                  <InfoRow label="Attendance" value={attendance} />
                )}
              </div>
            </div>

            {/* Student Photo */}
            <div className="w-20 h-24 border border-gray-200 rounded overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center shadow-sm mr-2">
              {student.profile.user?.image || data?.studentImage ? (
                <img
                  src={student.profile.user?.image || data?.studentImage}
                  alt="Student Photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider text-center px-1">No Photo</span>
              )}
            </div>
          </div>

          {/* ── Academic Performance Table ── */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b-2 border-blue-900 pb-1 mb-2">
              Academic Performance
            </h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="text-left px-2 py-1.5 border border-blue-800 w-[30%]">Subject</th>
                  <th className="text-center px-2 py-1.5 border border-blue-800 w-[10%]">Class Score</th>
                  <th className="text-center px-2 py-1.5 border border-blue-800 w-[10%]">Exam Score</th>
                  <th className="text-center px-2 py-1.5 border border-blue-800 w-[10%]">Total</th>
                  <th className="text-center px-2 py-1.5 border border-blue-800 w-[8%]">Grade</th>
                  <th className="text-left px-2 py-1.5 border border-blue-800 w-[32%]">Grade Description</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s: any, i: number) => {
                  const score = typeof s.totalScore === "number" ? s.totalScore : parseFloat(s.totalScore) || 0;
                  const classScore = typeof s.classWorkScore === "number" ? s.classWorkScore : parseFloat(s.classWorkScore) || 0;
                  const examScore = typeof s.examScore === "number" ? s.examScore : parseFloat(s.examScore) || 0;
                  const gradeInfo = scales.length > 0 ? lookupGrade(score, scales) : { grade: s.grade, description: s.remarks || "" };
                  const isEven = i % 2 === 0;
                  return (
                    <tr key={i} className={cn(isEven ? "bg-white" : "bg-gray-50")}>
                      <td className="px-2 py-1.5 border border-gray-300 font-bold text-gray-900">{s.subjectName}</td>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">{classScore.toFixed(1)}</td>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">{examScore.toFixed(1)}</td>
                      <td className="px-2 py-1.5 border border-gray-300 text-center font-bold text-gray-900">{score}</td>
                      <td className="px-2 py-1.5 border border-gray-300 text-center font-bold text-blue-800">{gradeInfo.grade}</td>
                      <td className="px-2 py-1.5 border border-gray-300 font-medium text-gray-800">{gradeInfo.description || s.remarks || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-900 text-gray-900">
                  <td className="px-2 py-1.5 border border-gray-300">Total</td>
                  <td className="px-2 py-1.5 border border-gray-300 text-center">
                    {subjects.reduce((sum, s) => sum + (typeof s.classWorkScore === "number" ? s.classWorkScore : parseFloat(s.classWorkScore) || 0), 0).toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-300 text-center">
                    {subjects.reduce((sum, s) => sum + (typeof s.examScore === "number" ? s.examScore : parseFloat(s.examScore) || 0), 0).toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-300 text-center font-black">
                    {grandTotal.toFixed(1)}
                  </td>
                  <td colSpan={2} className="px-2 py-1.5 border border-gray-300" />
                </tr>
              </tfoot>
            </table>
          </section>

          {/* ── Grade Key ── */}
          <section className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] text-gray-700">
            <span className="font-bold text-blue-900 uppercase">Grade Key: </span>
            {scales.length > 0 ? (
              scales.map((s, idx) => (
                <span key={s.id || idx}>
                  <span className="font-semibold text-gray-900">{s.grade}</span> = {s.description} ({s.minScore}–{s.maxScore})
                  {idx < scales.length - 1 ? " • " : ""}
                </span>
              ))
            ) : (
              <span>1 = Excellent (80-100) • 2 = Very Good (70-79) • 3 = Good (60-69) • 4 = Credit (50-59) • 5-6 = Pass (40-49) • 7-9 = Below Average (0-39)</span>
            )}
          </section>



          {/* ── Remarks ── */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b-2 border-blue-900 pb-1 mb-2">
              Remarks
            </h2>
            <div className="space-y-3">
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-1">Class Teacher's Remark</p>
                <p className="text-sm italic text-gray-800 min-h-[32px]">
                  {generalRemark || data?.behavioral?.general || data?.behavioral?.remarks || "—"}
                </p>
              </div>
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-1">Headmaster's Remark</p>
                <p className="text-sm italic text-gray-800 min-h-[32px]">
                  {headteacherRemark || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* ── Signatures ── */}
          <section className="mt-8 grid grid-cols-2 gap-8">
            <div className="text-center">
              {data?.classTeacherSignature && (
                <div className="flex justify-center mb-1">
                  <img
                    src={data.classTeacherSignature}
                    alt="Class Teacher Signature"
                    className="max-h-16 max-w-[120px] object-contain"
                  />
                </div>
              )}
              <div className="border-t border-gray-800 pt-1">
                <p className="text-xs font-semibold text-black">Class Teacher's Signature</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{data?.classTeacherName || "Class Teacher"}</p>
              </div>
            </div>
            <div className="text-center">
              {data?.headmasterSignature && (
                <div className="flex justify-center mb-1">
                  <img
                    src={data.headmasterSignature}
                    alt="Headmaster Signature"
                    className="max-h-16 max-w-[120px] object-contain"
                  />
                </div>
              )}
              <div className="border-t border-gray-800 pt-1">
                <p className="text-xs font-semibold text-black">Headmaster's Signature</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{data?.headmasterName || school.headmasterName || "Headmaster"}</p>
              </div>
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="border-t border-gray-300 pt-2 text-[10px] text-gray-400 text-center">
            This report card was generated by {school.name} •{" "}
            {new Date().getFullYear()} &bull; Powered by DrewsTech Services
          </div>
        </div>
      </div>
    </div>
  );
}
