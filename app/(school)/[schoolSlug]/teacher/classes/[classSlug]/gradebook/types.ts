export interface GradebookStudent {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    otherNames: string | null;
    image: string | null;
    email: string | null;
  };
  admissionNumber: string | null;
}

export interface AssessmentComponent {
  id: string;
  name: string;
  maxMarks: number;
  weight: number;
}

export interface GradeScale {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  description: string | null;
}

export interface GradebookTemplate {
  id: string;
  name: string;
  deadline: string | null;
  isLocked: boolean;
  components: AssessmentComponent[];
  gradingSystem: {
    gradeScales: GradeScale[];
  };
}

export interface ExistingScore {
  studentId: string;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINAL";
  isLocked: boolean;
  componentScores: {
    componentId: string;
    marksObtained: number;
  }[];
}

export interface MarksEntrySheetProps {
  students: GradebookStudent[];
  template: GradebookTemplate;
  existingScores: ExistingScore[];
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  extension?: {
    deadline: string;
  } | null;
  isPublished?: boolean;
}
