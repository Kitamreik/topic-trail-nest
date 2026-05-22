import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useSwipe } from "@/hooks/use-swipe";
import {
  FileUp, ChevronRight, ChevronLeft, Check, Send,
  ClipboardList, Star, MessageCircle, Upload, BookOpen,
} from "lucide-react";

// Types matching Google Quiz JSON export format
interface QuizQuestion {
  id: string;
  title: string;
  type: "multiple_choice" | "checkbox" | "short_answer" | "paragraph";
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  required: boolean;
}

interface QuizData {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

interface StudentResponse {
  questionId: string;
  answer: string | string[];
}

interface StudentSubmission {
  studentId: string;
  studentName: string;
  responses: StudentResponse[];
  submittedAt: string;
}

interface GradedQuestion {
  questionId: string;
  score: number;
  maxPoints: number;
  feedback: string;
}

interface GradedExam {
  examId: string;
  studentId: string;
  studentName: string;
  grades: GradedQuestion[];
  totalScore: number;
  maxScore: number;
  overallFeedback: string;
  gradedAt: string;
  gradedBy: string;
}

const EXAMS_KEY = "academic-stream-exams";
const SUBMISSIONS_KEY = "academic-stream-exam-submissions";
const GRADED_KEY = "academic-stream-graded-exams";

function loadStore<T>(key: string, fallback: T[]): T[] {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}
function saveStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Sample quiz JSON for demo
const sampleQuizJSON: QuizData = {
  title: "Midterm Exam — Introduction to Computer Science",
  description: "Covers Chapters 1-5: Data types, control flow, functions, and basic algorithms.",
  questions: [
    { id: "q1", title: "Which of the following is NOT a primitive data type in most programming languages?", type: "multiple_choice", options: ["Integer", "String", "Array", "Boolean"], correctAnswer: "Array", points: 10, required: true },
    { id: "q2", title: "Select all valid loop constructs:", type: "checkbox", options: ["for", "while", "do-while", "repeat-until", "loop-forever"], correctAnswer: ["for", "while", "do-while", "repeat-until"], points: 15, required: true },
    { id: "q3", title: "What is the time complexity of binary search?", type: "short_answer", correctAnswer: "O(log n)", points: 10, required: true },
    { id: "q4", title: "Explain the difference between a stack and a queue. Provide a real-world example of each.", type: "paragraph", points: 20, required: true },
    { id: "q5", title: "What does the 'return' keyword do in a function?", type: "multiple_choice", options: ["Terminates the program", "Sends a value back to the caller", "Prints to the console", "Declares a variable"], correctAnswer: "Sends a value back to the caller", points: 10, required: true },
  ],
};

type Step = "import" | "preview" | "take" | "submissions" | "grade" | "feedback" | "results";

export default function Exams() {
  const { user, isAdmin } = useAuth();
  const { activeSemester } = useSemester();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(isAdmin ? "import" : "take");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [currentQ, setCurrentQ] = useState(0);

  // Grading state
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [grades, setGrades] = useState<Record<string, { score: number; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [gradeStep, setGradeStep] = useState(0); // which question being graded

  // Load stored data
  const [exams, setExams] = useState<(QuizData & { id: string; semesterId: string })[]>(() => loadStore(EXAMS_KEY, []));
  const [submissions, setSubmissions] = useState<(StudentSubmission & { examId: string; semesterId: string })[]>(() => loadStore(SUBMISSIONS_KEY, []));
  const [gradedExams, setGradedExams] = useState<GradedExam[]>(() => loadStore(GRADED_KEY, []));

  const semesterExams = exams.filter(e => e.semesterId === activeSemester.id);
  const semesterSubmissions = submissions.filter(s => s.semesterId === activeSemester.id);

  // Import quiz from JSON
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as QuizData;
        if (!data.title || !data.questions?.length) {
          toast.error("Invalid quiz format. Must have title and questions.");
          return;
        }
        // Ensure IDs
        data.questions = data.questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}`, points: q.points || 10, required: q.required ?? true }));
        setQuiz(data);
        setStep("preview");
        toast.success(`Imported "${data.title}" with ${data.questions.length} questions`);
      } catch {
        toast.error("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSample = () => {
    setQuiz(sampleQuizJSON);
    setStep("preview");
    toast.success("Sample quiz loaded for demo");
  };

  const handlePublishExam = () => {
    if (!quiz) return;
    const newExam = { ...quiz, id: crypto.randomUUID(), semesterId: activeSemester.id };
    const updated = [...exams, newExam];
    setExams(updated);
    saveStore(EXAMS_KEY, updated);
    toast.success("Exam published!");
    setStep("submissions");
  };

  // Student taking exam
  const handleAnswer = (qId: string, answer: string | string[]) => {
    setResponses(prev => ({ ...prev, [qId]: answer }));
  };

  const handleCheckboxToggle = (qId: string, option: string) => {
    setResponses(prev => {
      const current = (prev[qId] as string[]) || [];
      const updated = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      return { ...prev, [qId]: updated };
    });
  };

  const handleSubmitExam = () => {
    if (!quiz || !user) return;
    const examId = semesterExams.find(e => e.title === quiz.title)?.id || quiz.title;
    const submission: StudentSubmission & { examId: string; semesterId: string } = {
      examId,
      semesterId: activeSemester.id,
      studentId: user.id,
      studentName: user.name,
      responses: quiz.questions.map(q => ({ questionId: q.id, answer: responses[q.id] || "" })),
      submittedAt: new Date().toISOString(),
    };
    const updated = [...submissions, submission];
    setSubmissions(updated);
    saveStore(SUBMISSIONS_KEY, updated);
    toast.success("Exam submitted!");
    setStep("results");
  };

  // Grading flow
  const startGrading = (sub: StudentSubmission) => {
    setSelectedSubmission(sub);
    const initial: Record<string, { score: number; feedback: string }> = {};
    quiz?.questions.forEach(q => {
      const response = sub.responses.find(r => r.questionId === q.id);
      // Auto-grade multiple choice and short answer
      let autoScore = 0;
      if (q.correctAnswer && response) {
        if (q.type === "multiple_choice" || q.type === "short_answer") {
          autoScore = String(response.answer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim() ? q.points : 0;
        } else if (q.type === "checkbox") {
          const correct = (q.correctAnswer as string[]).sort();
          const given = ((response.answer as string[]) || []).sort();
          autoScore = JSON.stringify(correct) === JSON.stringify(given) ? q.points : 0;
        }
      }
      initial[q.id] = { score: autoScore, feedback: "" };
    });
    setGrades(initial);
    setGradeStep(0);
    setOverallFeedback("");
    setStep("grade");
  };

  const handleSubmitGrades = () => {
    if (!quiz || !selectedSubmission || !user) return;
    const examId = semesterExams.find(e => e.title === quiz.title)?.id || quiz.title;
    const graded: GradedExam = {
      examId,
      studentId: selectedSubmission.studentId,
      studentName: selectedSubmission.studentName,
      grades: quiz.questions.map(q => ({
        questionId: q.id,
        score: grades[q.id]?.score || 0,
        maxPoints: q.points,
        feedback: grades[q.id]?.feedback || "",
      })),
      totalScore: Object.values(grades).reduce((s, g) => s + g.score, 0),
      maxScore: quiz.questions.reduce((s, q) => s + q.points, 0),
      overallFeedback,
      gradedAt: new Date().toISOString(),
      gradedBy: user.name,
    };
    const updated = [...gradedExams, graded];
    setGradedExams(updated);
    saveStore(GRADED_KEY, updated);
    toast.success(`Grades submitted for ${selectedSubmission.studentName}`);
    setStep("submissions");
  };

  // Student results view
  const myGrades = gradedExams.filter(g => g.studentId === user?.id);

  const progress = quiz ? ((currentQ + 1) / quiz.questions.length) * 100 : 0;

  // ─── RENDER ───

  // Step: Import
  if (step === "import" && isAdmin) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Exam Generator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Import a Google Quiz JSON or load a sample to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="font-semibold text-base sm:text-lg">Import JSON File</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">Upload a Google Quiz export (JSON format)</p>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={handleLoadSample}>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="font-semibold text-base sm:text-lg">Load Sample Quiz</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">Use a pre-built Computer Science midterm</p>
            </CardContent>
          </Card>
        </div>

        {semesterExams.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm sm:text-base">Published Exams</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {semesterExams.map(exam => (
                <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">{exam.questions.length} questions</p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => { setQuiz(exam); setStep("submissions"); }}>
                    View Submissions
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Step: Preview (admin reviews before publishing)
  if (step === "preview" && quiz) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">{quiz.title}</h1>
            {quiz.description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{quiz.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("import")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={handlePublishExam}>
                Publish <Send className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
          <Card key={q.id}>
              <CardContent className="pt-4 sm:pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Question {i + 1} • {q.type.replace("_", " ")} • {q.points} pts</p>
                    <p className="font-medium">{q.title}</p>
                  </div>
                  {q.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
                </div>
                {q.options && (
                  <ul className="mt-3 space-y-1.5">
                    {q.options.map(opt => (
                      <li key={opt} className={`text-sm px-3 py-1.5 rounded-md ${
                        (Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt)
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-muted/50"
                      }`}>
                        {opt} {(Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt) && <Check className="inline h-3 w-3 ml-1" />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Total: {quiz.questions.reduce((s, q) => s + q.points, 0)} points</p>
      </div>
    );
  }

  // Step: Student takes exam (multi-page, one question at a time)
  if (step === "take") {
    // Pick an available exam
    if (!quiz) {
      const available = semesterExams.filter(e => !submissions.some(s => s.examId === e.id && s.studentId === user?.id));
      if (available.length === 0) {
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" /> Exams
            </h1>
            {myGrades.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Your graded exams:</p>
                {myGrades.map((g, i) => (
                  <Card key={i}>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{exams.find(e => e.id === g.examId)?.title || "Exam"}</p>
                        <Badge variant={g.totalScore / g.maxScore >= 0.7 ? "default" : "destructive"}>
                          {g.totalScore}/{g.maxScore} ({Math.round(g.totalScore / g.maxScore * 100)}%)
                        </Badge>
                      </div>
                      {g.overallFeedback && <p className="text-sm text-muted-foreground mt-2 italic">"{g.overallFeedback}"</p>}
                      <p className="text-xs text-muted-foreground mt-1">Graded by {g.gradedBy} on {new Date(g.gradedAt).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No exams available at this time.</CardContent></Card>
            )}
          </div>
        );
      }
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Available Exams
          </h1>
          {available.map(exam => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.questions.length} questions • {exam.questions.reduce((s, q) => s + q.points, 0)} points</p>
                </div>
                <Button className="w-full sm:w-auto" onClick={() => { setQuiz(exam); setCurrentQ(0); setResponses({}); }}>
                  Start Exam <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {myGrades.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-6">Graded Results</h2>
              {myGrades.map((g, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{exams.find(e => e.id === g.examId)?.title || "Exam"}</p>
                      <Badge variant={g.totalScore / g.maxScore >= 0.7 ? "default" : "destructive"}>
                        {g.totalScore}/{g.maxScore}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      );
    }

    const q = quiz.questions[currentQ];
    const isLast = currentQ === quiz.questions.length - 1;

    const swipe = useSwipe({
      onSwipeLeft: () => { if (!isLast) setCurrentQ(c => c + 1); },
      onSwipeRight: () => { if (currentQ > 0) setCurrentQ(c => c - 1); },
    });

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-display font-bold">{quiz.title}</h1>
          <div className="flex items-center gap-2 sm:gap-3 mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{currentQ + 1}/{quiz.questions.length}</span>
          </div>
          <p className="md:hidden text-[10px] text-muted-foreground text-center mt-2">
            Swipe left/right to navigate questions
          </p>
        </div>

        <Card {...swipe} className="touch-pan-y select-none">
          <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted-foreground">Q{currentQ + 1} • {q.points} pts</p>
              {q.required && <Badge variant="outline" className="text-[9px] shrink-0">Required</Badge>}
            </div>
            <p className="font-medium text-base sm:text-lg">{q.title}</p>

            {q.type === "multiple_choice" && q.options && (
              <RadioGroup value={(responses[q.id] as string) || ""} onValueChange={v => handleAnswer(q.id, v)}>
                {q.options.map(opt => (
                  <div key={opt} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer flex-1">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === "checkbox" && q.options && (
              <div className="space-y-2">
                {q.options.map(opt => (
                  <div key={opt} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={((responses[q.id] as string[]) || []).includes(opt)}
                      onCheckedChange={() => handleCheckboxToggle(q.id, opt)}
                      id={`${q.id}-${opt}`}
                    />
                    <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer flex-1">{opt}</Label>
                  </div>
                ))}
              </div>
            )}

            {q.type === "short_answer" && (
              <Input
                placeholder="Your answer..."
                value={(responses[q.id] as string) || ""}
                onChange={e => handleAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === "paragraph" && (
              <Textarea
                placeholder="Write your answer here..."
                value={(responses[q.id] as string) || ""}
                onChange={e => handleAnswer(q.id, e.target.value)}
                rows={5}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentQ(c => c - 1)} disabled={currentQ === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {isLast ? (
            <Button onClick={handleSubmitExam}>
              Submit Exam <Send className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentQ(c => c + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Step: Results (student just submitted)
  if (step === "results") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-12">
        <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 inline-flex">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-display font-bold">Exam Submitted!</h1>
        <p className="text-muted-foreground">Your responses have been recorded. Your instructor will grade and provide feedback soon.</p>
        <Button onClick={() => { setQuiz(null); setStep("take"); }}>Back to Exams</Button>
      </div>
    );
  }

  // Step: Submissions (admin views submissions to grade)
  if (step === "submissions" && isAdmin && quiz) {
    const examSubs = semesterSubmissions.filter(s => s.examId === (semesterExams.find(e => e.title === quiz.title)?.id || ""));
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold">{quiz.title} — Submissions</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{examSubs.length} submissions received</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setQuiz(null); setStep("import"); }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {examSubs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No submissions yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {examSubs.map((sub, i) => {
              const alreadyGraded = gradedExams.some(g => g.examId === sub.examId && g.studentId === sub.studentId);
              return (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 sm:pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{sub.studentName}</p>
                      <p className="text-xs text-muted-foreground">Submitted {new Date(sub.submittedAt).toLocaleString()}</p>
                    </div>
                    {alreadyGraded ? (
                      <Badge variant="outline" className="text-emerald-600">Graded</Badge>
                    ) : (
                      <Button size="sm" onClick={() => startGrading(sub)}>
                        <Star className="h-4 w-4 mr-1" /> Grade
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Step: Grade (multi-page per question)
  if (step === "grade" && quiz && selectedSubmission) {
    const q = quiz.questions[gradeStep];
    const response = selectedSubmission.responses.find(r => r.questionId === q.id);
    const isLastQ = gradeStep === quiz.questions.length - 1;

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-display font-bold">Grading: {selectedSubmission.studentName}</h1>
          <div className="flex items-center gap-2 sm:gap-3 mt-2">
            <Progress value={((gradeStep + 1) / quiz.questions.length) * 100} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">Q{gradeStep + 1}/{quiz.questions.length}</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
            <p className="text-xs text-muted-foreground">Question {gradeStep + 1} • {q.points} points max</p>
            <p className="font-medium">{q.title}</p>

            {q.options && (
              <div className="space-y-1.5">
                {q.options.map(opt => {
                  const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                  const isSelected = Array.isArray(response?.answer) ? response.answer.includes(opt) : response?.answer === opt;
                  return (
                    <div key={opt} className={`text-sm px-3 py-2 rounded-md border ${
                      isCorrect && isSelected ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300" :
                      isSelected && !isCorrect ? "bg-destructive/10 border-destructive/30" :
                      isCorrect ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50" :
                      "bg-muted/30"
                    }`}>
                      {opt}
                      {isCorrect && <Check className="inline h-3 w-3 ml-1 text-emerald-600" />}
                      {isSelected && <span className="text-[10px] ml-2 text-muted-foreground">(selected)</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {!q.options && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Student's Answer:</p>
                <p className="text-sm">{response?.answer || <span className="italic text-muted-foreground">No answer provided</span>}</p>
              </div>
            )}

            {q.correctAnswer && !q.options && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 mb-1">Expected Answer:</p>
                <p className="text-sm">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</p>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Score:</Label>
                <Input
                  type="number"
                  min={0}
                  max={q.points}
                  value={grades[q.id]?.score ?? 0}
                  onChange={e => setGrades(g => ({ ...g, [q.id]: { ...g[q.id], score: Math.min(q.points, Math.max(0, Number(e.target.value))) } }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">/ {q.points}</span>
              </div>
              <div className="space-y-1">
                <Label>Feedback for this question:</Label>
                <Textarea
                  placeholder="Optional feedback..."
                  value={grades[q.id]?.feedback || ""}
                  onChange={e => setGrades(g => ({ ...g, [q.id]: { ...g[q.id], feedback: e.target.value } }))}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setGradeStep(s => s - 1)} disabled={gradeStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {isLastQ ? (
            <Button onClick={() => setStep("feedback")}>
              Overall Feedback <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setGradeStep(s => s + 1)}>
              Next Question <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Step: Feedback summary before submitting grades
  if (step === "feedback" && quiz && selectedSubmission) {
    const totalScore = Object.values(grades).reduce((s, g) => s + g.score, 0);
    const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <h1 className="text-lg sm:text-xl font-display font-bold">Review & Submit Grades</h1>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{selectedSubmission.studentName}</p>
              <Badge variant={totalScore / maxScore >= 0.7 ? "default" : "destructive"} className="text-lg px-3 py-1">
                {totalScore}/{maxScore} ({Math.round(totalScore / maxScore * 100)}%)
              </Badge>
            </div>

            <div className="space-y-2">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                  <span className="truncate flex-1">Q{i + 1}: {q.title}</span>
                  <span className={`font-mono ${grades[q.id]?.score === q.points ? "text-emerald-600" : grades[q.id]?.score === 0 ? "text-destructive" : "text-amber-600"}`}>
                    {grades[q.id]?.score}/{q.points}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Overall Feedback
              </Label>
              <Textarea
                placeholder="Write overall feedback for the student..."
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setGradeStep(quiz.questions.length - 1); setStep("grade"); }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Grading
          </Button>
          <Button onClick={handleSubmitGrades}>
            <Send className="h-4 w-4 mr-1" /> Submit Grades
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
