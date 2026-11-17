import {
  deanRules,
  formatLabel,
  slotFor,
  type DeanRules,
  type FormatId,
} from "@/lib/catalog"
import type { Course, ExamNote } from "@/lib/types"

const DEFAULT_HOURS: Record<FormatId, number> = {
  "blue-book": 8,
  "problem-set": 12,
  essay: 8,
  oral: 6,
  mixed: 8,
  paper: 14,
}

const READING_WINDOWS = [
  { id: "fri", when: "Friday, December 11", kicker: "Classes end at 5:30 p.m.", hours: 3 },
  { id: "sat", when: "Saturday, December 12", kicker: "Reading period", hours: 7 },
  { id: "sun", when: "Sunday, December 13", kicker: "Reading period", hours: 7 },
  { id: "mon", when: "Monday, December 14", kicker: "Last full day. Makeup exams sit at 2:00 p.m.", hours: 6 },
]

const OPEN_WINDOWS = [
  { id: "sat19", when: "Saturday, December 19", kicker: "No exams", hours: 6 },
  { id: "sun20", when: "Sunday, December 20", kicker: "No exams. Other coursework is due.", hours: 5 },
]

export type PlanBlock = {
  id: string
  when: string
  kicker: string
  lines: string[]
  tone: "study" | "exam" | "open"
}

export type Plan = {
  headline: string
  detail: string
  email: string | null
  rules: DeanRules
  move: Course | null
  wantedHours: number
  heldHours: number
  blocks: PlanBlock[]
  uncovered: string[]
  clashes: string[]
}

export function noteFor(course: Course, notes: ExamNote[]): ExamNote | null {
  const groupNotes = notes.filter((note) => note.examGroup === course.group)
  const instructor = course.instructor.trim().toLowerCase()
  if (instructor) {
    const match = groupNotes.find((note) => note.instructor.trim().toLowerCase() === instructor)
    if (match) return match
  }
  return groupNotes[0] ?? null
}

export function hoursFor(course: Course, notes: ExamNote[]): number {
  return noteFor(course, notes)?.hours ?? DEFAULT_HOURS[course.format]
}

function openingLine(course: Course, notes: ExamNote[]): string {
  const note = noteFor(course, notes)
  const byFormat: Record<FormatId, string> = {
    "blue-book": `Outline three prompts for ${course.name}, then write one timed 50-minute essay.`,
    "problem-set": `Redo the last problem set for ${course.name} closed-book, then time one practice set.`,
    essay: `Write one timed close reading for ${course.name}. Leave the novels closed.`,
    oral: `Run ${course.name} out loud once, then only the parts you still hesitate on.`,
    mixed: `One timed section of ${course.name}, then the newest material only.`,
    paper: `Outline ${course.name} and draft the opening. Leave the conclusion for later.`,
  }
  const base = byFormat[course.format]
  const personal = course.note.trim() ? ` Your note: ${course.note.trim()}` : ""
  const crowd = note ? ` Someone who sat this exam group: ${note.prepare}` : ""
  return `${base}${crowd}${personal}`
}

function continueLine(course: Course, hours: number): string {
  return `Stay with ${course.name} for ${hours}h. ${formatLabel(course.format)}, no new sources.`
}

function placed(courses: Course[]) {
  return courses
    .map((course) => ({ course, slot: slotFor(course.group) }))
    .sort((a, b) => (a.slot?.order ?? 99) - (b.slot?.order ?? 99))
}

function latestEarly(courses: Course[]): Course | null {
  const early = placed(courses).filter((item) => item.slot && item.slot.order < 6)
  return early.at(-1)?.course ?? null
}

export function buildPlan(
  courses: Course[],
  notes: ExamNote[],
  options: { deanMoves: boolean; holyDay: boolean; varsity: boolean; conflictId: string | null },
): Plan {
  const rules = deanRules(courses.map((course) => course.group))
  const exception = options.holyDay || options.varsity
  const clusterMove = rules.qualifies ? latestEarly(courses) ?? placed(courses).find((item) => item.slot)?.course ?? null : null
  const conflict = courses.find((course) => course.id === options.conflictId) ?? courses[0] ?? null
  const move = rules.qualifies ? clusterMove : exception ? conflict : null
  const deanMoves = options.deanMoves && move !== null

  const clashes: string[] = []
  const counts = new Map<string, Course[]>()
  for (const course of courses) {
    const list = counts.get(course.group) ?? []
    list.push(course)
    counts.set(course.group, list)
  }
  for (const [group, list] of counts) {
    if (list.length > 1 && group !== "0") {
      clashes.push(`${list.map((course) => course.name).join(" and ")} are both in exam group ${group}, so they occupy the same slot.`)
    }
  }

  const papers = courses.filter((course) => course.group === "0")
  const exams = placed(courses).filter((item) => item.slot)
  const early = exams.filter((item) => item.slot && item.slot.order < 6).map((item) => item.course)
  const mid = exams.filter((item) => item.slot && item.slot.order >= 6 && item.slot.order < 12).map((item) => item.course)
  const late = exams.filter((item) => item.slot && item.slot.order >= 12).map((item) => item.course)
  const unscheduled = courses.filter((course) => course.group === "50")

  const readingQueue = [...early, ...mid].filter((course) => !(deanMoves && course.id === move?.id))
  const queue = readingQueue.length > 0 ? readingQueue : late.filter((course) => !(deanMoves && course.id === move?.id))

  const remaining = new Map(courses.map((course) => [course.id, hoursFor(course, notes)]))
  const wantedHours = [...remaining.values()].reduce((sum, hours) => sum + hours, 0)

  const readingBlocks = assign(READING_WINDOWS, queue, remaining, notes, "study")
  const movedExam = deanMoves && move && move.group !== "0" ? move : null
  const stillWaiting = (list: Course[]) => {
    const seen = new Set<string>()
    return list.filter((course) => {
      if (seen.has(course.id)) return false
      seen.add(course.id)
      return (remaining.get(course.id) ?? 0) > 0
    })
  }
  const saturdayQueue = stillWaiting(papers.length > 0 ? papers : movedExam ? [movedExam] : late)
  const sundayQueue = stillWaiting([
    ...(movedExam ? [movedExam] : []),
    ...papers,
    ...late,
    ...unscheduled,
  ])
  const openBlocks = [
    ...assign([OPEN_WINDOWS[0]], saturdayQueue, remaining, notes, "open"),
    ...assign([OPEN_WINDOWS[1]], sundayQueue, remaining, notes, "open", movedExam ? 3 : undefined),
  ]

  const examBlocks: PlanBlock[] = exams.map(({ course, slot }) => ({
    id: `exam-${course.id}`,
    when: slot ? `${slot.day}, ${slot.time}` : course.name,
    kicker: deanMoves && course.id === move?.id ? "Ask your college dean to move this one" : `Group ${course.group} · ${formatLabel(course.format)}`,
    lines: [
      deanMoves && course.id === move?.id
        ? `Sit ${course.name} unless your residential college dean has already moved it. Keep one review ready either way.`
        : `Sit ${course.name}. Afterward, leave the next subject closed for two hours.`,
    ],
    tone: "exam",
  }))

  const firstExams = examBlocks.filter((block) => blocksInFirstHalf(block, exams))
  const secondExams = examBlocks.filter((block) => !firstExams.includes(block))

  const uncovered = courses
    .filter((course) => (remaining.get(course.id) ?? 0) > 0)
    .map((course) => {
      const left = remaining.get(course.id) ?? 0
      if (course.group === "0") {
        return `${course.name} still needs about ${left}h. Cut the scope. A finished short essay beats an unfinished long one by the end of finals on December 22, unless the syllabus names an earlier day.`
      }
      if (course.group === "50") {
        return `${course.name} is group 50, so the grid cannot place it. Put the syllabus time in the note, and budget ${left}h around it.`
      }
      const slot = slotFor(course.group)
      return `${course.name} still needs about ${left}h${slot ? ` before ${slot.shortDay}` : ""}. The night before is the leftover slot, and only if the earlier work is already drafted.`
    })

  const heldHours = READING_WINDOWS.reduce((sum, window) => sum + window.hours, 0) + OPEN_WINDOWS.reduce((sum, window) => sum + window.hours, 0)

  const earlyNames = early.map((course) => course.name)
  let headline = "Add your courses. The plan follows the order of the real exam grid."
  let detail = "Reading period starts Friday, December 11, at 5:30 p.m., when classes end, and runs through Monday, about 23 focused hours. The weekend of December 19–20 has no examinations and holds about 11 more."
  if (courses.length > 0 && rules.firstTwoDays && move) {
    headline = `${early.length} exams fall on December 15 and 16. Your residential college dean can move ${move.name}.`
    detail = deanMoves
      ? `This plan gives reading period to what still sits in those two days, and parks ${move.name} on the empty weekend of December 19–20. Send the note Monday morning. Keep one pass on it until the dean answers. A postponement is recorded as ABX until the makeup.`
      : `This plan keeps ${move.name} on the calendar. Reading period goes to the earliest exams, in order: ${earlyNames.join(", ")}.`
  } else if (courses.length > 0 && rules.qualifies && move) {
    headline = `This load meets a clustering rule. Your residential college dean can move ${move.name}.`
    detail = deanMoves
      ? `${move.name} is parked later in the plan. Everything earlier stays put.`
      : `Until your college dean says yes, study in exam order.`
  } else if (courses.length > 0 && exception && move) {
    headline = `A religious holy day or an intercollegiate varsity contest lets your college dean move ${move.name}.`
    detail = "The clustering rules are separate. Travel is not a reason. Club and intramural contests are not a reason."
  } else if (courses.length > 0) {
    headline = "Nothing in this load qualifies for a postponement from your residential college dean."
    detail = `Study in exam order. ${papers.length > 0 ? "The paper still wants the empty weekend." : "The empty weekend is recovery, unless a later exam is still uncovered."}`
  }

  if (wantedHours > heldHours && courses.length > 0) {
    detail += ` The load wants about ${wantedHours}h and the calendar holds about ${heldHours}h, so later courses get whatever the early ones leave.`
  }

  const email = move && (rules.qualifies || exception) ? draftEmail(rules, early, move, exception) : null

  return {
    headline,
    detail,
    email,
    rules: { ...rules, qualifies: rules.qualifies || exception },
    move,
    wantedHours,
    heldHours,
    blocks: [...readingBlocks, ...firstExams, ...openBlocks, ...secondExams],
    uncovered,
    clashes,
  }
}

function blocksInFirstHalf(block: PlanBlock, exams: { course: Course; slot: ReturnType<typeof slotFor> }[]): boolean {
  const match = exams.find((item) => block.id === `exam-${item.course.id}`)
  return (match?.slot?.order ?? 99) < 12
}

function assign(
  windows: { id: string; when: string; kicker: string; hours: number }[],
  ordered: Course[],
  remaining: Map<string, number>,
  notes: ExamNote[],
  tone: "study" | "open",
  cap?: number,
): PlanBlock[] {
  return windows.map((window) => {
    let left = window.hours
    const lines: string[] = []
    for (const course of ordered) {
      const need = remaining.get(course.id) ?? 0
      if (need <= 0 || left <= 0) continue
      const used = Math.min(need, left, cap ?? Number.POSITIVE_INFINITY)
      const isFirst = need === hoursFor(course, notes)
      remaining.set(course.id, need - used)
      left -= used
      lines.push(isFirst ? `${openingLine(course, notes)} (${used}h)` : continueLine(course, used))
    }
    return {
      id: window.id,
      when: window.when,
      kicker: window.kicker,
      lines: lines.length > 0 ? lines : ["Hold this day. The urgent work is on the other days."],
      tone,
    }
  })
}

function draftEmail(rules: DeanRules, early: Course[], move: Course, exception: boolean): string {
  if (rules.firstTwoDays && early.length >= 3) {
    const list = early
      .map((course) => {
        const slot = slotFor(course.group)
        return `${course.name} (group ${course.group}${slot ? `, ${slot.shortDay} ${slot.time}` : ""})`
      })
      .join("; ")
    return `Dear Dean, I have ${early.length} final examinations on December 15 and 16: ${list}. Academic Regulations, section H, allow a residential college dean to postpone an examination when three fall on the first two full days of the final examination period. I am asking to postpone ${move.name}. I will keep studying it until I hear back. If you authorize the postponement, I understand the registrar records ABX until the makeup.`
  }
  if (exception && !rules.qualifies) {
    return `Dear Dean, ${move.name} conflicts with a religious holy day I observe, or with an intercollegiate varsity contest. Section H allows a residential college dean to postpone that examination. Club and intramural contests are not a reason, and neither are my travel plans.`
  }
  return `Dear Dean, my final examinations cluster closely enough that section H allows a residential college dean to postpone one: three in a row, or three inside any four consecutive slots on consecutive days. I am asking to postpone ${move.name}. Any reason outside section H would go to the Committee on Honors and Academic Standing.`
}
