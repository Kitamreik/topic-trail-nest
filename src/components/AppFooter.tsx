import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type PolicyKey = "integrity" | "conduct" | "privacy" | "accessibility";

const policies: Record<PolicyKey, { title: string; body: string }> = {
  integrity: {
    title: "Academic Integrity Policy",
    body: `All learners enrolled in Kit TJ Services — Learning with Cookie are expected to uphold the highest standards of academic honesty.

1. Original Work — All submissions must represent the learner's own work unless collaboration is explicitly permitted by the instructor.
2. Citation — Any external sources, including AI-generated content, must be appropriately cited.
3. Examinations — Unauthorized aids, communication, or materials are prohibited during exams.
4. Plagiarism — Presenting another's work, ideas, or words as your own constitutes plagiarism and may result in disciplinary action.
5. Consequences — Violations may result in a failing grade for the assignment, course failure, or removal from the platform.

This template is provided for demonstration purposes and should be reviewed by your institution's academic affairs office before adoption.`,
  },
  conduct: {
    title: "Code of Conduct",
    body: `Kit TJ Services — Learning with Cookie is committed to providing a respectful and inclusive learning environment.

1. Respect — Treat all participants with dignity, regardless of background, identity, or perspective.
2. Communication — Discussions, chat, and feedback should remain constructive and professional.
3. Harassment-Free — Bullying, harassment, hate speech, and discrimination are not tolerated.
4. Safe Space — Report concerns to a Webmaster or Administrator through the platform.
5. Enforcement — Violations may result in warning, suspension, or account termination.

This template is provided for demonstration purposes only.`,
  },
  privacy: {
    title: "Privacy & Data Policy",
    body: `Kit TJ Services — Learning with Cookie processes personal data solely for the operation of the learning platform.

1. Data Collected — Name, email, role, course activity, submissions, and grades.
2. Storage — In this demo environment, data is stored locally in your browser (localStorage) and is not transmitted to external servers.
3. Use of Data — Used for authentication, grading, analytics, and communications.
4. Retention — Retained for the duration of enrollment plus institutional retention requirements.
5. Your Rights — You may request access, correction, or deletion of your personal data via a Webmaster.

This template is provided for demonstration purposes and is not a substitute for legal guidance.`,
  },
  accessibility: {
    title: "Accessibility Statement",
    body: `Kit TJ Services — Learning with Cookie strives to be accessible to all learners.

1. Standards — We aim to conform to WCAG 2.1 Level AA guidelines.
2. Features — Keyboard navigation, semantic markup, color-contrast considerations, and light/dark themes.
3. Accommodations — Learners requiring accommodations should contact their instructor or institution's disability services office.
4. Feedback — Accessibility concerns can be reported through the platform's support channels.

This template is provided for demonstration purposes only.`,
  },
};

export function AppFooter() {
  const [open, setOpen] = useState<PolicyKey | null>(null);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 px-4 sm:px-6 py-5 text-xs text-muted-foreground">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} Kit TJ Services — Learning with Cookie. All rights reserved.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {(Object.keys(policies) as PolicyKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
              onClick={() => setOpen(k)}
            >
              {policies[k].title}
            </button>
          ))}
        </nav>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{policies[open].title}</DialogTitle>
                <DialogDescription>Template policy — review and adapt before institutional use.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {policies[open].body}
                </p>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </footer>
  );
}
