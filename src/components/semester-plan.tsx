"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  cutoffFor,
  formatLong,
  gradeNeed,
  isStalled,
  matchCourse,
  minutesInWeek,
  parseGradeTable,
  parseIcs,
  quietDays,
  remindersFor,
  semesterWeeks,
  todayInNewYork,
  weekContaining,
  weekSuggestions,
  type GradePart,
} from "@/lib/semester"
import { SAMPLE_EVENTS, SAMPLE_PARTS, SAMPLE_PREP } from "@/lib/semester-sample"
import { GRADE_TARGETS, type CalendarEvent, type Course, type GradeTarget, type PrepLog } from "@/lib/types"

const PREP_KEY = "reading-period-prep-v2"
const EVENT_KEY = "reading-period-events-v2"
const PART_KEY = "reading-period-parts-v2"
const NOTIFY_KEY = "reading-period-notified-v1"

export function SemesterPlan({
  courses,
  setCourses,
  section = "week",
  onOpenCourse,
}: {
  courses: Course[]
  setCourses: (update: (current: Course[]) => Course[]) => void
  section?: "today" | "week" | "grades" | "calendar"
  onOpenCourse?: (courseId: string) => void
}) {
  const [preps, setPreps] = useState<PrepLog[]>(SAMPLE_PREP)
  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS)
  const [parts, setParts] = useState<GradePart[]>(SAMPLE_PARTS)
  const [ready, setReady] = useState(false)
  const [weekIndex, setWeekIndex] = useState(() => {
    const list = semesterWeeks()
    const current = weekContaining(todayInNewYork(), list)
    return Math.max(0, list.findIndex((week) => week.start === current.start))
  })
  const [openId, setOpenId] = useState<string | null>(courses[0]?.id ?? null)
  const [paste, setPaste] = useState("")
  const [gradesPaste, setGradesPaste] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("2026-11-21")
  const [eventKind, setEventKind] = useState<CalendarEvent["kind"]>("personal")
  const [message, setMessage] = useState("")
  const today = todayInNewYork()
  const weeks = useMemo(() => semesterWeeks(), [])

  useEffect(() => {
    const storedPreps = readList<PrepLog>(PREP_KEY)
    const storedEvents = readList<CalendarEvent>(EVENT_KEY)
    const storedParts = readList<GradePart>(PART_KEY)
    if (storedPreps) setPreps(storedPreps)
    if (storedEvents) setEvents(storedEvents)
    if (storedParts) setParts(storedParts)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(PREP_KEY, JSON.stringify(preps))
    localStorage.setItem(EVENT_KEY, JSON.stringify(events))
    localStorage.setItem(PART_KEY, JSON.stringify(parts))
  }, [preps, events, parts, ready])

  const week = weeks[weekIndex] ?? weeks[0]
  const suggestions = useMemo(
    () => weekSuggestions(courses, parts, events, preps, week, today),
    [courses, parts, events, preps, week, today],
  )
  const reminders = useMemo(() => remindersFor(courses, events, preps, today), [courses, events, preps, today])

  useEffect(() => {
    if (!ready || typeof Notification === "undefined" || Notification.permission !== "granted") return
    const sent = readMap(NOTIFY_KEY)
    let changed = false
    for (const reminder of reminders) {
      if (sent[reminder.id] === today) continue
      new Notification(reminder.title, { body: reminder.body })
      sent[reminder.id] = today
      changed = true
    }
    if (changed) localStorage.setItem(NOTIFY_KEY, JSON.stringify(sent))
  }, [ready, reminders, today])

  function logPrep(courseId: string, minutes: number) {
    setPreps((current) => [{ id: crypto.randomUUID(), courseId, date: today, minutes }, ...current])
  }

  function addEvent() {
    const title = eventTitle.trim()
    if (!title || !eventDate) {
      setMessage("Name the event and give it a date.")
      return
    }
    setEvents((current) => [
      { id: crypto.randomUUID(), title, date: eventDate, courseId: matchCourse(title, courses), kind: eventKind, source: "manual" },
      ...current,
    ])
    setEventTitle("")
    setMessage("Added. The suggestions for that week move around it.")
  }

  function importCanvas(text: string) {
    const parsed = parseIcs(text)
    if (parsed.length === 0) {
      setMessage("No events in that text. Paste a Canvas calendar feed, or an .ics file.")
      return
    }
    setEvents((current) => [
      ...parsed.map((item) => ({
        id: crypto.randomUUID(),
        title: item.title,
        date: item.date,
        courseId: matchCourse(item.title, courses),
        kind: /exam|quiz|midterm|final/i.test(item.title) ? "exam" as const : "assignment" as const,
        source: "canvas" as const,
      })),
      ...current,
    ])
    setPaste("")
    setMessage(`Added ${parsed.length} Canvas date${parsed.length === 1 ? "" : "s"}. Scores still come from the syllabus weights, not from the calendar.`)
  }

  const open = courses.find((course) => course.id === openId) ?? null

  if (section === "today") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[#4d6d8c]">{week.note ?? formatLong(week.start)}</p>
        <ul className="divide-y divide-[#c5d7ea] border border-[#c5d7ea] bg-white">
          {suggestions.map((item) => {
            const course = courses.find((entry) => entry.id === item.courseId)
            if (!course) return null
            const need = gradeNeed(parts.filter((part) => part.courseId === course.id), course.targetGrade ?? "B+", cutoffFor(course), course.name)
            return (
              <li key={item.courseId}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left" onClick={() => onOpenCourse?.(course.id)}>
                  <span className="font-medium">{course.designation ? `${course.designation} · ` : ""}{course.name}</span>
                  <span className="text-sm text-[#286dc0]">{needLabel(need)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {reminders.slice(0, 3).map((reminder) => (
          <p key={reminder.id} className="text-sm">{reminder.title}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {section === "week" && (
      <>
      <p className="text-sm text-[#4d6d8c]">Suggestions only. Not a grade in Yale Hub.</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-heading text-2xl">This week</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={weekIndex <= 0} onClick={() => setWeekIndex((index) => Math.max(0, index - 1))}>
              Previous
            </Button>
            <span className="text-sm">{formatLong(week.start)}</span>
            <Button variant="outline" size="sm" disabled={weekIndex >= weeks.length - 1} onClick={() => setWeekIndex((index) => Math.min(weeks.length - 1, index + 1))}>
              Next
            </Button>
          </div>
        </div>
        {week.note && <Badge variant="secondary">{week.note}</Badge>}
        <ul className="flex flex-col gap-3">
          {suggestions.map((item) => {
            const course = courses.find((entry) => entry.id === item.courseId)
            if (!course) return null
            const need = gradeNeed(parts.filter((part) => part.courseId === course.id), course.targetGrade ?? "B+", cutoffFor(course), course.name)
            return (
              <li key={item.courseId} className="border border-foreground/15 bg-card px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <button type="button" className="text-left font-medium" onClick={() => setOpenId(course.id)}>
                    {course.designation ? `${course.designation} · ` : ""}{course.name}
                  </button>
                  <span className="text-sm text-primary">{needLabel(need)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.text.split(". ")[0]}.</p>
              </li>
            )
          })}
          {courses.length === 0 && <li className="text-sm text-muted-foreground">Add a course first.</li>}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm text-[#286dc0]">Heatmap</summary>
        <div className="overflow-x-auto">
          <table className="min-w-[52rem] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background p-1 text-left font-medium">Course</th>
                {weeks.map((item) => (
                  <th key={item.start} className={`p-1 text-center font-medium ${item.start === week.start ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label.replace(" 2026", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <th className="sticky left-0 bg-background p-1 text-left font-normal">{course.designation ? `${course.designation} · ` : ""}{course.name}</th>
                  {weeks.map((item) => {
                    const minutes = minutesInWeek(course.id, item, preps)
                    const future = item.start > today
                    return (
                      <td key={item.start} className="p-0.5" title={`${minutes} min · week of ${item.label}`}>
                        <div className={`h-6 ${heatClass(minutes, future)}`} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 border border-foreground/15 bg-card" /> 0</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 bg-primary/20" /> under 45</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 bg-primary/40" /> 45–89</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 bg-primary/70" /> 90–149</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 bg-primary" /> 150+</span>
          <span>Darker means more minutes.</span>
        </div>
        </details>
      </>
      )}

      {section === "grades" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <Button key={course.id} size="sm" variant={course.id === open?.id ? "default" : "outline"} onClick={() => setOpenId(course.id)}>
                {course.name}
              </Button>
            ))}
          </div>
          <p className="text-sm text-[#4d6d8c]">A suggestion from your weights. Not the grade in Yale Hub.</p>
          {open && (
            <CourseGrade
              course={open}
              parts={parts.filter((part) => part.courseId === open.id)}
              stalled={isStalled(open.id, preps, today)}
              quietWeeks={Math.floor(quietDays(open.id, preps, today) / 7)}
              gradesPaste={gradesPaste}
              setGradesPaste={setGradesPaste}
              onGrade={(targetGrade) => setCourses((current) => current.map((course) => course.id === open.id ? { ...course, targetGrade, cutoff: undefined } : course))}
              onCutoff={(cutoff) => setCourses((current) => current.map((course) => course.id === open.id ? { ...course, cutoff } : course))}
              onLog={(minutes) => logPrep(open.id, minutes)}
              onParts={(next) => setParts((current) => [...current.filter((part) => part.courseId !== open.id), ...next])}
            />
          )}
        </div>
      )}

      {section === "calendar" && (
      <section className="grid gap-6 border border-[#c5d7ea] bg-white p-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">Calendar</h2>
          <p className="text-sm text-[#4d6d8c]">Canvas dates move the week. Scores stay in Grades.</p>
          <Label>Event</Label>
          <Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="The Game, a trip, a concert" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            <Select value={eventKind} onValueChange={(value) => { if (value) setEventKind(value as CalendarEvent["kind"]) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={addEvent}>Add to the calendar</Button>
          <ul className="flex flex-col gap-1 text-sm">
            {events.slice(0, 8).map((event) => (
              <li key={event.id} className="flex justify-between gap-3">
                <span>{event.title}</span>
                <span className="text-muted-foreground">{event.date}{event.sample ? " · sample" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">Add your Canvas</h2>
          <p className="text-sm text-[#4d6d8c]">
            Calendar, then Calendar feed. Dates only.
          </p>
          <Textarea value={paste} onChange={(event) => setPaste(event.target.value)} rows={5} placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261119\nSUMMARY:Physics problem set 9\nEND:VEVENT\nEND:VCALENDAR"} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => importCanvas(paste)}>Import pasted calendar</Button>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="file"
                accept=".ics,text/calendar"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  importCanvas(await file.text())
                  event.target.value = ""
                }}
              />
              <span className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-sm">Upload .ics</span>
            </label>
          </div>
          {message && <p className="text-sm">{message}</p>}
        </div>
      </section>
      )}
    </div>
  )
}

function CourseGrade({
  course,
  parts,
  stalled,
  quietWeeks,
  gradesPaste,
  setGradesPaste,
  onGrade,
  onCutoff,
  onLog,
  onParts,
}: {
  course: Course
  parts: GradePart[]
  stalled: boolean
  quietWeeks: number
  gradesPaste: string
  setGradesPaste: (value: string) => void
  onGrade: (grade: GradeTarget) => void
  onCutoff: (cutoff: number) => void
  onLog: (minutes: number) => void
  onParts: (parts: GradePart[]) => void
}) {
  const target = course.targetGrade ?? "B+"
  const cutoff = cutoffFor(course)
  const need = gradeNeed(parts, target, cutoff, course.name)
  const usingDefault = course.cutoff === undefined
  return (
    <section className="flex flex-col gap-4 border border-foreground/15 bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">{course.designation ? `${course.designation} · ` : ""}{course.name}</h2>
          <p className="text-sm text-muted-foreground">
            Target {target === "CR" ? "CR" : target}. Cutoff used: {cutoff}%.
            {usingDefault ? " Planning default, until you replace it with the syllabus." : " From the cutoff you entered."}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label>Syllabus cutoff</Label>
            <Input
              className="h-8 w-20"
              type="number"
              min={1}
              max={100}
              value={cutoff}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value)) onCutoff(value)
              }}
            />
          </div>
          <Select value={target} onValueChange={(value) => { if (value) onGrade(value as GradeTarget) }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADE_TARGETS.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {target === "CR" && (
        <p className="text-sm text-[#4d6d8c]">CR needs a C- or better. Convert by Dec 11.</p>
      )}
      <p className="text-sm leading-relaxed">{need.suggestion}</p>
      {need.weightTotal > 0 && (
        <p className="text-xs text-muted-foreground">
          Scored work is {need.earnedPoints.toFixed(1)} points out of {need.weightTotal}. {need.currentAverage === null ? "No average yet." : `Current average on scored work: ${need.currentAverage.toFixed(1)}%.`} Weights that do not add to 100 are used exactly as entered.
        </p>
      )}
      {stalled && <p className="text-sm text-destructive">Quiet for {quietWeeks} weeks. Logging a session today ends the pause.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onLog(45)}>Log 45 min today</Button>
        <Button size="sm" variant="outline" onClick={() => onLog(90)}>Log 90 min today</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">Component</th>
              <th className="py-1 font-medium">Weight</th>
              <th className="py-1 font-medium">Score</th>
              <th className="py-1 font-medium">Exam</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-t border-foreground/10">
                <td className="py-1 pr-2">{part.name}</td>
                <td className="py-1 pr-2">
                  <Input
                    className="h-7 w-16"
                    type="number"
                    value={part.weight}
                    onChange={(event) => onParts(parts.map((item) => item.id === part.id ? { ...item, weight: Number(event.target.value), sample: false } : item))}
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    className="h-7 w-20"
                    type="number"
                    placeholder="Not yet"
                    value={part.score ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value
                      onParts(parts.map((item) => item.id === part.id ? { ...item, score: raw === "" ? null : Number(raw), sample: false } : item))
                    }}
                  />
                </td>
                <td className="py-1">
                  <input
                    type="checkbox"
                    checked={part.exam}
                    onChange={(event) => onParts(parts.map((item) => item.id === part.id ? { ...item, exam: event.target.checked, sample: false } : item))}
                    aria-label={`${part.name} counts as the exam`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Paste syllabus weights</Label>
        <Textarea
          rows={3}
          value={gradesPaste}
          onChange={(event) => setGradesPaste(event.target.value)}
          placeholder={"Problem sets | 25 | 78\nMidterm | 25 | 74\nFinal | 40 |"}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const parsed = parseGradeTable(gradesPaste, course.id).map((part) => ({ ...part, id: crypto.randomUUID() }))
            if (parsed.length === 0) return
            onParts(parsed)
            setGradesPaste("")
          }}
        >
          Replace weights for this course
        </Button>
        <p className="text-xs text-muted-foreground">Name, weight, and score, separated by bars. Leave the score blank if it is not graded yet. A line with “final”, “midterm”, “quiz”, or “exam” is treated as the exam.</p>
      </div>
    </section>
  )
}

function needLabel(need: ReturnType<typeof gradeNeed>): string {
  if (need.status === "no-weights") return "Add weights"
  if (need.needed === null) {
    const total = need.weightTotal > 0 ? Math.round((need.earnedPoints / need.weightTotal) * 1000) / 10 : 0
    return `Weighted ${total}%`
  }
  if (need.status === "cleared") return need.examName ? `Clears on ${need.examName}` : "Clears the cutoff"
  return `About ${need.needed}%${need.examName ? ` on ${need.examName}` : ""}`
}

function heatClass(minutes: number, future: boolean): string {
  if (future) return "bg-transparent border border-foreground/10"
  if (minutes <= 0) return "border border-foreground/15 bg-card"
  if (minutes < 45) return "bg-primary/20"
  if (minutes < 90) return "bg-primary/40"
  if (minutes < 150) return "bg-primary/70"
  return "bg-primary"
}

function readList<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}
