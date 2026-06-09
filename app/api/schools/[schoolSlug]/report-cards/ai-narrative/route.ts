import { NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

    const body = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const generateOne = async (item: {
      studentId?: string;
      studentName: string;
      conduct?: string;
      attitude?: string;
      punctuality?: string;
      bulletPoints?: string[];
      academicSummary?: string;
    }) => {
      let behaviorSection = "";
      if (item.conduct || item.attitude || item.punctuality) {
        behaviorSection = `
        Behavioral Assessment:
        - Conduct: ${item.conduct || "N/A"}
        - Attitude: ${item.attitude || "N/A"}
        - Punctuality: ${item.punctuality || "N/A"}
        `;
      }

      let observationSection = "";
      if (item.bulletPoints && item.bulletPoints.length > 0) {
        observationSection = `
        Observational Points:
        ${item.bulletPoints.map((bp) => `- ${bp}`).join("\n")}
        `;
      }

      const prompt = `
        You are an expert, professional teacher writing a final term report card remark for a student.

        Student Name: ${item.studentName}
        ${item.academicSummary ? `Brief Academic Summary: ${item.academicSummary}\n` : ""}
        ${behaviorSection}
        ${observationSection}
        
        Task: Write a single, cohesive, professional, and encouraging remark paragraph suitable for an official school report card. The remark must reflect and synthesize the student's traits and observations described above.

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
      return {
        studentId: item.studentId,
        narrative: result.response.text().trim(),
      };
    };

    const generateBatch = async (chunk: any[]) => {
      const prompt = `
        You are an expert, professional teacher writing final term report card remarks for a list of students.

        For each student, write a single, cohesive, professional, and encouraging remark paragraph suitable for an official school report card.
        The remark must reflect and synthesize the student's traits and observations described above.

        General Requirements for each remark:
        1. Write exactly one paragraph (2-4 sentences).
        2. Maintain a professional, warm, and encouraging tone.
        3. Do not include any greetings, sign-offs, or placeholder text.
        4. Naturally mention the student's name.
        5. Make it feel personal and specific to the given traits — avoid generic filler phrases.
        6. End with an encouraging note for the next term.

        Here is the list of students:
        ${JSON.stringify(
          chunk.map((s) => ({
            studentId: s.studentId,
            studentName: s.studentName,
            conduct: s.conduct || undefined,
            attitude: s.attitude || undefined,
            punctuality: s.punctuality || undefined,
            bulletPoints: s.bulletPoints || undefined,
            academicSummary: s.academicSummary || undefined,
          })),
          null,
          2,
        )}

        Respond with a JSON object containing a "results" array, where each item has "studentId" and the generated "narrative".
      `;

      const schema = {
        type: SchemaType.OBJECT as const,
        properties: {
          results: {
            type: SchemaType.ARRAY as const,
            description: "List of generated remarks for the students",
            items: {
              type: SchemaType.OBJECT as const,
              properties: {
                studentId: { type: SchemaType.STRING as const, description: "The unique ID of the student as provided in the input list" },
                narrative: { type: SchemaType.STRING as const, description: "The generated cohesive, professional, and encouraging remark paragraph for this student." }
              },
              required: ["studentId", "narrative"]
            }
          }
        },
        required: ["results"]
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      if (!parsed || !Array.isArray(parsed.results)) {
        throw new Error("Invalid response structure from AI");
      }

      return parsed.results;
    };

    // Batch Mode
    if (body.students && Array.isArray(body.students)) {
      const chunkSize = 15;
      const chunks: any[][] = [];
      for (let i = 0; i < body.students.length; i += chunkSize) {
        chunks.push(body.students.slice(i, i + chunkSize));
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const chunkResults: any[] = [];
        try {
          // Attempt batch generation
          const batchRes = await generateBatch(chunk);
          const resultMap = new Map<string, string>();
          for (const item of batchRes) {
            if (item.studentId && item.narrative) {
              resultMap.set(item.studentId, item.narrative);
            }
          }

          // Map back and verify completeness
          for (const s of chunk) {
            const narrative = resultMap.get(s.studentId);
            if (narrative) {
              chunkResults.push({
                studentId: s.studentId,
                narrative: narrative.trim(),
              });
            } else {
              // Fallback to individual for this student
              console.warn(`Student ${s.studentName} (${s.studentId}) was missing from batch result. Falling back to individual generation.`);
              try {
                const indRes = await generateOne(s);
                chunkResults.push(indRes);
              } catch (indErr: any) {
                chunkResults.push({
                  studentId: s.studentId,
                  error: indErr?.message || "Failed to generate narrative",
                });
              }
            }
          }
        } catch (err: any) {
          console.error("Batch generation failed, falling back to individual generation for this chunk", err);
          // Fallback: generate all students in this chunk individually
          const fallbackPromises = chunk.map(async (s) => {
            try {
              return await generateOne(s);
            } catch (indErr: any) {
              return {
                studentId: s.studentId,
                error: indErr?.message || "Failed to generate narrative",
              };
            }
          });
          const fallbackResults = await Promise.all(fallbackPromises);
          chunkResults.push(...fallbackResults);
        }
        return chunkResults;
      });

      const allChunksResults = await Promise.all(chunkPromises);
      const results = allChunksResults.flat();
      return NextResponse.json({ results, success: true });
    }

    // Single Mode
    const { studentName, conduct, attitude, punctuality, bulletPoints, academicSummary } = body;

    const hasBehavior = conduct && attitude && punctuality;
    const hasBullets = bulletPoints && Array.isArray(bulletPoints) && bulletPoints.length > 0;

    if (!studentName || (!hasBehavior && !hasBullets)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: studentName and either (conduct, attitude, punctuality) or bulletPoints",
        },
        { status: 400 },
      );
    }

    const res = await generateOne({
      studentName,
      conduct,
      attitude,
      punctuality,
      bulletPoints,
      academicSummary,
    });

    return NextResponse.json({ narrative: res.narrative, success: true });
  } catch (error) {
    console.error("[AI_NARRATIVE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}
