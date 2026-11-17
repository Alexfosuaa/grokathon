import { addDays } from "@/lib/semester"
import type { GradePart } from "@/lib/semester"
import type { CalendarEvent, PrepLog } from "@/lib/types"

export const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: "ev-math", title: "MATH 1150 quiz", date: "2026-11-18", courseId: "math", kind: "exam", source: "canvas", sample: true },
  { id: "ev-phys", title: "PHYS 1800 pset 9", date: "2026-11-19", courseId: "physics", kind: "assignment", source: "canvas", sample: true },
  { id: "ev-eng", title: "Intro English essay 3", date: "2026-11-20", courseId: "english", kind: "assignment", source: "canvas", sample: true },
  { id: "ev-game", title: "The Game: Yale vs. Harvard", date: "2026-11-21", courseId: null, kind: "personal", source: "manual", sample: true },
  { id: "ev-conf", title: "ENGL 1014 conference with the TF", date: "2026-12-01", courseId: "paper", kind: "personal", source: "canvas", sample: true },
]

export const SAMPLE_PARTS: GradePart[] = [
  { id: "lang-q", courseId: "language", name: "Quizzes", weight: 20, score: 96, exam: true, sample: true },
  { id: "lang-o", courseId: "language", name: "Oral", weight: 20, score: 94, exam: true, sample: true },
  { id: "lang-h", courseId: "language", name: "Homework", weight: 20, score: 98, exam: false, sample: true },
  { id: "lang-f", courseId: "language", name: "Final", weight: 40, score: null, exam: true, sample: true },
  { id: "sem-p", courseId: "seminar", name: "Papers", weight: 40, score: 91, exam: false, sample: true },
  { id: "sem-d", courseId: "seminar", name: "Discussion", weight: 20, score: 88, exam: false, sample: true },
  { id: "sem-f", courseId: "seminar", name: "Final blue book", weight: 40, score: null, exam: true, sample: true },
  { id: "eng-e", courseId: "english", name: "Essays", weight: 50, score: 84, exam: false, sample: true },
  { id: "eng-p", courseId: "english", name: "Participation", weight: 10, score: 95, exam: false, sample: true },
  { id: "eng-f", courseId: "english", name: "Final", weight: 40, score: null, exam: true, sample: true },
  { id: "phy-p", courseId: "physics", name: "Psets", weight: 25, score: 78, exam: false, sample: true },
  { id: "phy-m", courseId: "physics", name: "Midterm", weight: 25, score: 74, exam: true, sample: true },
  { id: "phy-l", courseId: "physics", name: "Labs", weight: 10, score: 90, exam: false, sample: true },
  { id: "phy-f", courseId: "physics", name: "Final", weight: 40, score: null, exam: true, sample: true },
  { id: "math-p", courseId: "math", name: "Psets", weight: 15, score: 92, exam: false, sample: true },
  { id: "math-m", courseId: "math", name: "Midterm", weight: 25, score: 85, exam: true, sample: true },
  { id: "math-f", courseId: "math", name: "Final", weight: 60, score: null, exam: true, sample: true },
  { id: "paper-d", courseId: "paper", name: "Drafts", weight: 40, score: 88, exam: false, sample: true },
  { id: "paper-p", courseId: "paper", name: "Participation", weight: 20, score: 100, exam: false, sample: true },
  { id: "paper-f", courseId: "paper", name: "Final paper", weight: 40, score: null, exam: true, sample: true },
]

function weekly(courseId: string, start: string, end: string, minutes: number): PrepLog[] {
  const logs: PrepLog[] = []
  let date = start
  while (date <= end) {
    logs.push({ id: `${courseId}-${date}`, courseId, date, minutes, sample: true })
    date = addDays(date, 7)
  }
  return logs
}

export const SAMPLE_PREP: PrepLog[] = [
  ...weekly("language", "2026-09-08", "2026-11-17", 70),
  ...weekly("math", "2026-09-09", "2026-11-11", 60),
  { id: "eng-1", courseId: "english", date: "2026-09-14", minutes: 50, sample: true },
  { id: "eng-2", courseId: "english", date: "2026-10-05", minutes: 60, sample: true },
  { id: "eng-3", courseId: "english", date: "2026-10-19", minutes: 55, sample: true },
  { id: "eng-4", courseId: "english", date: "2026-11-02", minutes: 40, sample: true },
  { id: "sem-1", courseId: "seminar", date: "2026-09-28", minutes: 80, sample: true },
  { id: "phy-1", courseId: "physics", date: "2026-09-15", minutes: 50, sample: true },
  { id: "paper-1", courseId: "paper", date: "2026-10-20", minutes: 90, sample: true },
  { id: "paper-2", courseId: "paper", date: "2026-11-09", minutes: 70, sample: true },
]
