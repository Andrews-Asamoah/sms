import { NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // Ensure user has access
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);
    if (
      !role ||
      (role.effectiveRole !== "admin" &&
        role.effectiveRole !== "teacher" &&
        role.effectiveRole !== "owner" &&
        !session.isSuperAdmin)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!genAI) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 },
      );
    }

    const { studentName, conduct, attitude, punctuality, academicSummary } =
      await request.json();

    if (!studentName || !conduct || !attitude || !punctuality) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: studentName, conduct, attitude, and punctuality",
        },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert, professional teacher writing a final term report card remark for a student.

      Student Name: ${studentName}
      ${academicSummary ? `Brief Academic Summary: ${academicSummary}\n` : ""}
      
      Behavioral Assessment:
      - Conduct: ${conduct}
      - Attitude: ${attitude}
      - Punctuality: ${punctuality}

      Task: Write a single, cohesive, professional, and encouraging remark paragraph suitable for an official school report card. The remark must reflect and synthesize the student's conduct, attitude, and punctuality as described above.

      Requirements:
      1. Write exactly one paragraph (2-4 sentences).
      2. Maintain a professional, warm, and encouraging tone.
      3. Do not include any greetings, sign-offs, or placeholder text.
      4. Naturally mention the student's name.
      5. Make it feel personal and specific to the given traits — avoid generic filler phrases.
      6. End with an encouraging note for the next term.

      Output the final remark text only, with no extra explanation.
    `;

    const result = await model.generateContent(prompt);
    const narrative = result.response.text().trim();

    return NextResponse.json({ narrative, success: true });
  } catch (error) {
    console.error("[AI_NARRATIVE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}
