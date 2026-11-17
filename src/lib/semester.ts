import type { CalendarEvent, Course, GradeTarget, PrepLog } from "@/lib/types"

export const SEMESTER_START = "2026-09-02"
export const STALL_DAYS = 42

/** Planning defaults only. Yale College publishes no percentage scale. */
export const DEFAULT_CUTOFFS: Record<GradeTarget, number> = {
  A: 93,
  "A-": 90,
  "B+": 87,
  B: 83,
  "B-": 80,
  "C+": 77,
  C: 73,
  "C-": 70,
  "D+": 67,
  D: 63,
  "D-": 60,
  CR: 70,
}

export function cutoffFor(course: Course): number {
  const target = course.targetGrade ?? "B+"
  if (course.cutoff !== undefined && Number.isFinite(course.cutoff)) return course.cutoff
  return DEFAULT_CUTOFFS[target]
}

export type GradePart = {
  id: string
  courseId: string
  name: string
  weight: number
  score: number | null
  exam: boolean
  sample?: boolean
}

export type GradeNeed = {
  cutoff: number
  weightTotal: number
  earnedPoints: number
  currentAverage: number | null
  examName: string | null
  examWeight: number
  needed: number | null
  status: "no-weights" | "nothing-graded" | "cleared" | "ahead" | "reachable" | "stretch" | "out-of-reach"
  suggestion: string
}

export type SemesterWeek = {
  start: string
  end: string
  label: string
  note: string | null
  detail: string | null
}

export type WeekSuggestion = {
  courseId: string
  text: string
  stalled: boolean
}

export type Reminder = {
  id: string
  title: string
  body: string
}

export function todayInNewYork(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now)
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  const [ys, ms, ds] = start.split("-").map(Number)
  const [ye, me, de] = end.split("-").map(Number)
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000)
}

export function formatLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function formatShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function semesterWeeks(): SemesterWeek[] {
  const weeks: SemesterWeek[] = []
  let start = "2026-08-31"
  while (start <= "2026-12-07") {
    weeks.push({
      start,
      end: addDays(start, 6),
      label: formatShort(start),
      note: weekNote(start),
      detail: weekDetail(start),
    })
    start = addDays(start, 7)
  }
  return weeks
}

function weekNote(start: string): string | null {
  if (start === "2026-08-31") return "Classes begin Wednesday, 8:20 a.m."
  if (start === "2026-09-07") return "Labor Day. Add/drop ends Friday."
  if (start === "2026-10-05") return "Family Weekend, Oct 9–11"
  if (start === "2026-10-19") return "October recess begins Tuesday"
  if (start === "2026-11-16") return "Spring registration, then The Game"
  if (start === "2026-11-23") return "November recess"
  if (start === "2026-11-30") return "Classes resume Monday, 8:20 a.m."
  if (start === "2026-12-07") return "Reading period begins Friday"
  return null
}

function weekDetail(start: string): string | null {
  if (start === "2026-08-31") return "Fall-term classes begin Wednesday, September 2, at 8:20 a.m. On Friday, September 4, Friday classes do not meet and Monday classes meet instead."
  if (start === "2026-09-07") return "Labor Day. Classes do not meet. Add/drop period ends Friday, September 11, at 5:00 p.m."
  if (start === "2026-10-05") return "Family Weekend is Friday, October 9, through Sunday, October 11."
  if (start === "2026-10-19") return "Monday and Tuesday still meet. October recess begins after the last academic obligation on Tuesday, October 20, which is also midterm and the last day to withdraw from a full-term course without a W. Classes resume Monday, October 26, at 8:20 a.m."
  if (start === "2026-11-16") return "Spring registration opens in Yale Hub by class year: the Class of 2027 on Monday, the Class of 2028 on Tuesday, the Class of 2029 on Wednesday, and the Class of 2030 on Thursday. Friday is the last day of classes before November recess. Saturday, November 21, is The Game, Yale versus Harvard."
  if (start === "2026-11-23") return "November recess. Classes resume Monday, November 30, at 8:20 a.m."
  if (start === "2026-11-30") return "Classes resume Monday, November 30, at 8:20 a.m."
  if (start === "2026-12-07") return "Classes end Friday, December 11, at 5:30 p.m. Reading period begins. That is also the last day to convert a full-term course to Credit/D/Fail, and the last day to withdraw."
  return null
}

export function weekContaining(today: string, weeks = semesterWeeks()): SemesterWeek {
  return weeks.find((week) => today >= week.start && today <= week.end) ?? weeks[weeks.length - 1]
}

export function gradeNeed(parts: GradePart[], target: GradeTarget, cutoff: number, courseName: string): GradeNeed {
  const usable = parts.filter((part) => part.weight > 0)
  const weightTotal = usable.reduce((sum, part) => sum + part.weight, 0)
  if (weightTotal <= 0) {
    return {
      cutoff,
      weightTotal: 0,
      earnedPoints: 0,
      currentAverage: null,
      examName: null,
      examWeight: 0,
      needed: null,
      status: "no-weights",
      suggestion: `Add the weights from the ${courseName} syllabus. Until those are in, there is no number to suggest.`,
    }
  }

  const scored = usable.filter((part) => part.score !== null)
  const scoredWeight = scored.reduce((sum, part) => sum + part.weight, 0)
  const earnedPoints = scored.reduce((sum, part) => sum + (part.weight * (part.score ?? 0)) / 100, 0)
  const currentAverage = scoredWeight > 0 ? (earnedPoints / scoredWeight) * 100 : null

  if (scored.length === 0) {
    return {
      cutoff,
      weightTotal,
      earnedPoints: 0,
      currentAverage: null,
      examName: null,
      examWeight: 0,
      needed: cutoff,
      status: "nothing-graded",
      suggestion: `Nothing is scored yet. A suggestion: treat ${round(cutoff)}% as the pace for ${target === "CR" ? "CR, which needs a C- or better" : articleGrade(target)}. That is the cutoff this page is using. Yale College does not publish one, and it is not what the instructor will record in Yale Hub.`,
    }
  }

  const openExams = usable
    .filter((part) => part.score === null && part.exam)
    .sort((a, b) => b.weight - a.weight)
  const exam = openExams[0] ?? null
  const otherOpen = usable.filter((part) => part.score === null && part !== exam)
  const assumed = otherOpen.reduce((sum, part) => sum + (part.weight * (currentAverage ?? 0)) / 100, 0)
  const targetPoints = (cutoff / 100) * weightTotal
  const pool = exam ? exam.weight : otherOpen.reduce((sum, part) => sum + part.weight, 0)
  if (pool <= 0) {
    const total = (earnedPoints / weightTotal) * 100
    const met = total + 0.05 >= cutoff
    return {
      cutoff,
      weightTotal,
      earnedPoints,
      currentAverage,
      examName: null,
      examWeight: 0,
      needed: null,
      status: met ? "cleared" : "out-of-reach",
      suggestion: met
        ? `Suggestion: every component is already scored. The weighted total is ${round(total)}%, which clears ${target === "CR" ? "a C-, so the registrar would record CR" : `${articleGrade(target)} at ${round(cutoff)}`}. That is the arithmetic of the weights you entered, not the grade in Yale Hub.`
        : `Suggestion: every component is already scored. The weighted total is ${round(total)}%, short of ${target === "CR" ? "a C-, so this would not convert to CR" : `${articleGrade(target)} at ${round(cutoff)}`}. Nothing is left open unless a score or a weight changes.`,
    }
  }
  const rawNeeded = pool > 0 ? ((targetPoints - earnedPoints - (exam ? assumed : 0)) / pool) * 100 : null
  const needed = rawNeeded === null ? null : Math.round(rawNeeded * 10) / 10
  const examName = exam?.name ?? (pool > 0 ? "the work still open" : null)
  const status = statusFor(needed, currentAverage)
  return {
    cutoff,
    weightTotal,
    earnedPoints,
    currentAverage,
    examName,
    examWeight: exam?.weight ?? pool,
    needed,
    status,
    suggestion: suggestionFor(status, needed, currentAverage, examName, target, cutoff, courseName),
  }
}

function statusFor(needed: number | null, currentAverage: number | null): GradeNeed["status"] {
  if (needed === null) return "cleared"
  if (needed <= 0) return "cleared"
  if (needed > 100) return "out-of-reach"
  if (currentAverage !== null && needed <= currentAverage) return "ahead"
  if (currentAverage !== null && needed > currentAverage + 8) return "stretch"
  return "reachable"
}

function suggestionFor(
  status: GradeNeed["status"],
  needed: number | null,
  currentAverage: number | null,
  examName: string | null,
  target: GradeTarget,
  cutoff: number,
  courseName: string,
): string {
  const where = examName ?? "the work still open"
  const average = currentAverage === null ? "your current average" : `${round(currentAverage)}%`
  if (status === "cleared") {
    if (target === "CR") {
      return `Suggestion, not a forecast: on these weights, ${courseName} already clears a C-, so the registrar would convert the instructor's letter to CR even if ${where} scores 0. That is arithmetic, not a reason to skip the exam. D+, D, D-, and F would stay on the transcript.`
    }
    return `Suggestion, not a forecast: on these weights, ${courseName} already clears ${articleGrade(target)} at ${round(cutoff)} even if ${where} scores 0. That is arithmetic. It is not a suggestion to skip the exam.`
  }
  if (target === "CR" && needed !== null && status === "out-of-reach") {
    return `Suggestion: CR needs a C- or better from the instructor. That would take about ${round(needed)}% on ${where}, which is above 100 on these weights. A dropped score is a syllabus question. D+, D, D-, and F stay on the transcript as reported.`
  }
  if (target === "CR" && needed !== null) {
    return `Suggestion: about ${round(needed)}% on ${where} still reaches a C- at ${round(cutoff)}, if the other open work holds at ${average}. The registrar converts C- and above to CR. The instructor still reports a letter, and D+, D, D-, and F stay as reported.`
  }
  if (status === "out-of-reach" && needed !== null) {
    return `Suggestion: ${articleGrade(target)} would take about ${round(needed)}% on ${where} if everything else still open matches your ${average} average. That is above 100. Ask whether the syllabus drops a score, or aim at the next cutoff the arithmetic can still reach.`
  }
  if (status === "stretch" && needed !== null) {
    return `Suggestion: ${articleGrade(target)} wants about ${round(needed)}% on ${where}, above your ${average} average. Put the next study block on the problems you missed, not on a new topic.`
  }
  if (status === "ahead" && needed !== null) {
    return `Suggestion: about ${round(needed)}% on ${where} still clears ${articleGrade(target)} at ${round(cutoff)}, at or under your ${average} average, if the other open work holds. Keep the weekly pass short if another course needs the hours more.`
  }
  if (needed !== null) {
    return `Suggestion: about ${round(needed)}% on ${where} clears ${articleGrade(target)} at the ${round(cutoff)} cutoff, if the other open work holds at ${average}.`
  }
  return `Suggestion: the scored work in ${courseName} already accounts for the full weight of ${articleGrade(target)}.`
}

function articleGrade(target: GradeTarget): string {
  if (target === "CR") return "CR"
  return /^[AEF]/.test(target) ? `an ${target}` : `a ${target}`
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

export function lastPrep(courseId: string, preps: PrepLog[]): string | null {
  const dates = preps.filter((prep) => prep.courseId === courseId).map((prep) => prep.date).sort()
  return dates.at(-1) ?? null
}

export function quietDays(courseId: string, preps: PrepLog[], today: string): number {
  const last = lastPrep(courseId, preps)
  return daysBetween(last ?? SEMESTER_START, today)
}

export function isStalled(courseId: string, preps: PrepLog[], today: string): boolean {
  return quietDays(courseId, preps, today) >= STALL_DAYS
}

export function minutesInWeek(courseId: string, week: SemesterWeek, preps: PrepLog[]): number {
  return preps
    .filter((prep) => prep.courseId === courseId && prep.date >= week.start && prep.date <= week.end)
    .reduce((sum, prep) => sum + prep.minutes, 0)
}

export function weekSuggestions(
  courses: Course[],
  parts: GradePart[],
  events: CalendarEvent[],
  preps: PrepLog[],
  week: SemesterWeek,
  today: string,
): WeekSuggestion[] {
  const inWeek = events.filter((event) => event.date >= week.start && event.date <= week.end)
  const busy = inWeek.filter((event) => event.kind === "personal").map((event) => event.title)
  const recess = week.start === "2026-11-23"
  return courses.map((course) => {
    const stalled = isStalled(course.id, preps, today) && today >= week.start
    const due = inWeek.filter((event) => event.courseId === course.id && event.kind !== "personal")
    const need = gradeNeed(
      parts.filter((part) => part.courseId === course.id),
      course.targetGrade ?? "B+",
      cutoffFor(course),
      course.name,
    )
    if (recess && due.length === 0) {
      return {
        courseId: course.id,
        stalled,
        text: stalled
          ? `${course.name} has no logged prep in ${Math.floor(quietDays(course.id, preps, today) / 7)} weeks. Suggestion for the recess: one 90-minute reopen, then stop. The ${course.targetGrade ?? "B+"} pace stays paused until you log a session.`
          : `${course.name}: recess week. Suggestion: leave it unless something is due the week classes resume.`,
      }
    }
    const dueText = due.map((event) => `${event.title} is due ${formatLong(event.date)}`).join(". ")
    const busyText = busy.length > 0 ? ` ${busy.join(" and ")} takes time this week, so finish graded work before that.` : ""
    if (stalled) {
      return {
        courseId: course.id,
        stalled: true,
        text: `No prep logged for ${course.name} in ${Math.floor(quietDays(course.id, preps, today) / 7)} weeks. Suggestion: 90 minutes to reopen the last unit, then only the next graded piece.${dueText ? ` ${dueText}.` : ""}${busyText} ${need.suggestion}`,
      }
    }
    const pace = paceLine(course, need)
    return {
      courseId: course.id,
      stalled: false,
      text: `${pace}${dueText ? ` ${dueText}.` : ""}${busyText}`,
    }
  })
}

function paceLine(course: Course, need: GradeNeed): string {
  const aim = course.targetGrade === "CR" ? "toward CR" : `for ${articleGrade(course.targetGrade ?? "B+")}`
  if (course.format === "problem-set") {
    return `Suggestion ${aim} in ${course.name}: do the pset the day it is posted, and take one miss to the TF before the weekend.`
  }
  if (course.format === "blue-book") {
    return `Suggestion ${aim} in ${course.name}: read before the seminar, then write half a page of argument. A blue book wants the argument, not a summary of the reading.`
  }
  if (course.format === "essay") {
    return `Suggestion ${aim} in ${course.name}: one timed passage before section. Bring the draft to the TF, not a reread of the whole book.`
  }
  if (course.format === "paper") {
    return `Suggestion ${aim} in ${course.name}: add a page this week. Group 0 has no exam slot. The term essay wants reading period, not the night before another final.`
  }
  if (course.format === "oral" || course.format === "mixed") {
    return `Suggestion ${aim} in ${course.name}: one timed drill, then say the newest grammar out loud once. The oral sits inside the language final.`
  }
  return need.suggestion
}

export function remindersFor(
  courses: Course[],
  events: CalendarEvent[],
  preps: PrepLog[],
  today: string,
): Reminder[] {
  const soon = events.filter((event) => {
    const distance = daysBetween(today, event.date)
    return distance >= 0 && distance <= 2 && event.kind !== "personal"
  })
  const due = soon.map((event) => ({
    id: `due-${event.id}`,
    title: event.title,
    body: `Due ${formatLong(event.date)}. This is a reminder, not a change to the grade.`,
  }))
  const stalls = courses.filter((course) => isStalled(course.id, preps, today)).map((course) => ({
    id: `stall-${course.id}`,
    title: `${course.name} has gone quiet`,
    body: `No prep logged in ${Math.floor(quietDays(course.id, preps, today) / 7)} weeks. Suggestion: a 90-minute reopen this week. The target grade stays where you set it.`,
  }))
  return [...due, ...stalls]
}

export function weekSummary(
  courses: Course[],
  events: CalendarEvent[],
  week: SemesterWeek,
  suggestions: WeekSuggestion[],
): string {
  const due = events.filter((event) => event.date >= week.start && event.date <= week.end && event.kind !== "personal")
  const personal = events.filter((event) => event.date >= week.start && event.date <= week.end && event.kind === "personal")
  const stalled = suggestions.filter((item) => item.stalled).length
  const lead = week.detail
    ? `Week of ${formatLong(week.start)}. ${week.detail}`
    : week.note
      ? `Week of ${formatLong(week.start)}. ${week.note}.`
      : `Week of ${formatLong(week.start)}.`
  const work = due.length > 0 ? ` ${due.length} graded thing${due.length === 1 ? "" : "s"} due.` : " Nothing graded is due."
  const life = personal.length > 0 ? ` ${personal.map((event) => event.title).join(", ")} is on the calendar, so the suggestions move earlier in the week.` : ""
  const quiet = stalled > 0 ? ` ${stalled} ${stalled === 1 ? "course has" : "courses have"} no prep logged in six weeks, so those suggestions shrink to a reopen.` : ""
  return `${lead}${work}${life}${quiet} ${courses.length} courses in the portfolio. Every line below is a suggestion.`
}

export function parseIcs(text: string): { title: string; date: string }[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "")
  return unfolded.split(/BEGIN:VEVENT/i).slice(1).flatMap((chunk) => {
    const body = chunk.split(/END:VEVENT/i)[0] ?? ""
    const title = icsField(body, "SUMMARY")
    const start = icsField(body, "DTSTART")
    if (!title || !start) return []
    const digits = start.replace(/\D/g, "").slice(0, 8)
    if (digits.length < 8) return []
    return [{ title: unescapeIcs(title), date: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` }]
  })
}

export function parseGradeTable(text: string, courseId: string): GradePart[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const bits = line.split("|").map((bit) => bit.trim())
      if (bits.length < 2) return []
      const weight = Number(bits[1])
      if (!bits[0] || !Number.isFinite(weight)) return []
      const raw = bits[2]
      const score = raw === undefined || raw === "" ? null : Number(raw)
      return [{
        id: `${courseId}-${bits[0].toLowerCase().replace(/\s+/g, "-")}`,
        courseId,
        name: bits[0],
        weight,
        score: score !== null && Number.isFinite(score) ? score : null,
        exam: /final|midterm|exam|blue book|quiz/i.test(bits[0]),
      }]
    })
}

export function matchCourse(title: string, courses: Course[]): string | null {
  const hay = title.toLowerCase()
  const byName = courses.find((course) => hay.includes(course.name.toLowerCase()))
  if (byName) return byName.id
  const hints: [string, string][] = [
    ["phys 1800", "physics"],
    ["physics", "physics"],
    ["engl 1014", "paper"],
    ["writing", "paper"],
    ["intro english", "english"],
    ["english", "english"],
    ["math 1150", "math"],
    ["math", "math"],
    ["l5", "language"],
    ["language", "language"],
    ["college seminar", "seminar"],
    ["seminar", "seminar"],
  ]
  for (const [hint, id] of hints) {
    if (hay.includes(hint) && courses.some((course) => course.id === id)) return id
  }
  return null
}

function icsField(body: string, name: string): string | null {
  const match = body.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, "im"))
  return match?.[1]?.trim() ?? null
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\\\/g, "\\").trim()
}
