"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  FORMATS,
  GRID_DAYS,
  GROUP_OPTIONS,
  TIME_LABELS,
  formatLabel,
  slotFor,
  type FormatId,
} from "@/lib/catalog"
import { buildPlan, hoursFor } from "@/lib/plan"
import { SAMPLE_COURSES, SAMPLE_NOTES } from "@/lib/sample"
import { SemesterPlan } from "@/components/semester-plan"
import { YaleMark } from "@/components/yale-mark"
import { YaleSignIn } from "@/components/yale-sign-in"
import type { Course, Designation, ExamNote } from "@/lib/types"
import { DESIGNATIONS } from "@/lib/types"

const COURSE_KEY = "reading-period-courses-v2"
const NOTE_KEY = "reading-period-notes-v1"

const emptyDraft = {
  name: "",
  instructor: "",
  group: "34",
  format: "blue-book" as FormatId,
  designation: "HU" as Designation,
  note: "",
}

export function ReadingPeriod() {
  const [courses, setCourses] = useState<Course[]>(SAMPLE_COURSES)
  const [notes, setNotes] = useState<ExamNote[]>(SAMPLE_NOTES)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_COURSES[0].id)
  const [deanMoves, setDeanMoves] = useState(false)
  const [holyDay, setHolyDay] = useState(false)
  const [varsity, setVarsity] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [noteDraft, setNoteDraft] = useState({
    showedUp: "",
    prepare: "",
    hours: "8",
    season: "December 2025",
  })
  const [formError, setFormError] = useState("")
  const [session, setSession] = useState<{ email: string; netid: string } | null>(null)
  const [tab, setTab] = useState<"today" | "courses" | "semester" | "finals">("today")
  const [semesterTab, setSemesterTab] = useState<"week" | "grades" | "calendar">("week")
  const [finalsTab, setFinalsTab] = useState<"grid" | "plan" | "dean">("grid")

  useEffect(() => {
    const storedCourses = readJson<Course[]>(COURSE_KEY)
    const storedNotes = readJson<ExamNote[]>(NOTE_KEY)
    if (storedCourses && storedCourses.length >= 0 && storedCourses.every(isCourse)) {
      setCourses(storedCourses)
      if (storedCourses[0]) setSelectedId(storedCourses[0].id)
    }
    if (storedNotes && storedNotes.every(isNote)) {
      const extras = storedNotes.filter((note) => !note.sample)
      setNotes([...SAMPLE_NOTES, ...extras])
    }
    const storedSession = readJson<{ email: string; netid: string }>("ylearn-session-v1")
    if (storedSession?.email?.endsWith("@yale.edu") && storedSession.netid) setSession(storedSession)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(COURSE_KEY, JSON.stringify(courses))
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes.filter((note) => !note.sample)))
  }, [courses, notes, ready])

  const selected = courses.find((course) => course.id === selectedId) ?? courses[0] ?? null
  const plan = useMemo(
    () =>
      buildPlan(courses, notes, {
        deanMoves,
        holyDay,
        varsity,
        conflictId: selected?.id ?? null,
      }),
    [courses, notes, deanMoves, holyDay, varsity, selected?.id],
  )

  const selectedNotes = selected
    ? notes.filter((note) => note.examGroup === selected.group)
    : []

  function addCourse() {
    const name = draft.name.trim()
    if (!name) {
      setFormError("Name the course.")
      return
    }
    const course: Course = {
      id: crypto.randomUUID(),
      name,
      instructor: draft.instructor.trim(),
      group: draft.group,
      format: draft.format,
      designation: draft.designation,
      note: draft.note.trim(),
    }
    setCourses((current) => [...current, course])
    setSelectedId(course.id)
    setDraft(emptyDraft)
    setFormError("")
    setAdding(false)
  }

  function addNote() {
    if (!selected) return
    const showedUp = noteDraft.showedUp.trim()
    const prepare = noteDraft.prepare.trim()
    const hours = Number(noteDraft.hours)
    if (showedUp.length < 8 || prepare.length < 8) {
      setFormError("Say what showed up, and how you would prepare. A sentence each is enough.")
      return
    }
    if (!Number.isFinite(hours) || hours < 1 || hours > 40) {
      setFormError("Hours should be between 1 and 40.")
      return
    }
    const note: ExamNote = {
      id: crypto.randomUUID(),
      examGroup: selected.group,
      courseName: selected.name,
      instructor: selected.instructor.trim(),
      format: selected.format,
      showedUp,
      prepare,
      hours: Math.round(hours),
      season: noteDraft.season.trim() || "This term",
      sample: false,
    }
    setNotes((current) => [note, ...current])
    setNoteDraft({ showedUp: "", prepare: "", hours: "8", season: "December 2025" })
    setFormError("")
  }

  function resetSample() {
    setCourses(SAMPLE_COURSES)
    setNotes(SAMPLE_NOTES)
    setSelectedId(SAMPLE_COURSES[0].id)
    setDeanMoves(false)
    setHolyDay(false)
    setVarsity(false)
    setFormError("")
  }

  if (!ready) return <div className="min-h-screen bg-white" />
  if (!session) {
    return (
      <YaleSignIn
        onSignIn={(next) => {
          localStorage.setItem("ylearn-session-v1", JSON.stringify(next))
          setSession(next)
        }}
      />
    )
  }

  const tabs = [
    ["today", "Today"],
    ["courses", "Courses"],
    ["semester", "Semester"],
    ["finals", "Finals"],
  ] as const

  return (
    <div className="min-h-screen bg-white text-[#00356B]">
      <header className="bg-[#00356B] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <YaleMark className="h-8 w-8" />
            <div>
              <p className="text-lg font-semibold leading-none">YLearn</p>
              <p className="mt-1 text-[11px] text-[#A7C4E5]">Yale College · Fall 2026</p>
            </div>
          </div>
          <button
            type="button"
            className="text-sm text-[#A7C4E5]"
            onClick={() => {
              localStorage.removeItem("ylearn-session-v1")
              setSession(null)
            }}
          >
            {session.netid}
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-2 text-sm ${tab === id ? "bg-white text-[#00356B]" : "text-[#A7C4E5]"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-5xl">
        {(tab === "semester" || tab === "finals") && (
          <nav className="w-40 shrink-0 border-r border-[#c5d7ea] bg-[#e7f0fa] pt-6">
            <div className="flex flex-col text-sm">
              {tab === "semester" &&
                (["week", "grades", "calendar"] as const).map((id) => (
                  <button key={id} type="button" className={`px-4 py-2 text-left capitalize ${semesterTab === id ? "border-r-2 border-[#00356B] font-medium" : "text-[#4d6d8c]"}`} onClick={() => setSemesterTab(id)}>
                    {id}
                  </button>
                ))}
              {tab === "finals" &&
                (["grid", "plan", "dean"] as const).map((id) => (
                  <button key={id} type="button" className={`px-4 py-2 text-left capitalize ${finalsTab === id ? "border-r-2 border-[#00356B] font-medium" : "text-[#4d6d8c]"}`} onClick={() => setFinalsTab(id)}>
                    {id === "dean" ? "College dean" : id}
                  </button>
                ))}
            </div>
          </nav>
        )}

      <main className="flex-1 flex flex-col gap-6 px-4 py-6">
        {tab === "today" && (
          <SemesterPlan
            courses={courses}
            setCourses={setCourses}
            section="today"
            onOpenCourse={(id) => {
              setSelectedId(id)
              setTab("semester")
              setSemesterTab("grades")
            }}
          />
        )}
        {tab === "semester" && (
          <SemesterPlan courses={courses} setCourses={setCourses} section={semesterTab} />
        )}
        {tab === "finals" && finalsTab === "grid" && (
          <ExamGrid courses={courses} moveId={deanMoves ? plan.move?.id ?? null : null} onSelect={(id) => { setSelectedId(id); setTab("courses") }} selectedId={selected?.id ?? null} />
        )}
        {tab === "finals" && finalsTab === "plan" && (
          <section className="flex flex-col gap-4">
            <p className="text-lg font-semibold">{plan.headline}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{plan.wantedHours}h wanted</Badge>
              <Badge variant="outline">{plan.heldHours}h open</Badge>
            </div>
            <ol className="flex flex-col">
              {plan.blocks.map((block) => (
                <li key={block.id} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-[#c5d7ea] py-3">
                  <div>
                    <p className="text-xs text-[#286dc0] uppercase">{block.kicker}</p>
                    <p className="text-sm font-medium">{block.when}</p>
                  </div>
                  <div>
                    {block.lines.map((line) => (
                      <p key={line} className="text-sm">{line}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        {tab === "finals" && finalsTab === "dean" && (
          <section className="flex max-w-xl flex-col gap-3">
            <p className="text-lg font-semibold">{plan.move ? `Ask about ${plan.move.name}` : "No postponement on this load"}</p>
            <ul className="list-disc pl-4 text-sm text-[#4d6d8c]">
              <li>3 exams on Dec 15–16</li>
              <li>3 back to back, or 3 in any 4 slots</li>
              <li>Holy day or varsity</li>
              <li>Your college dean decides. Travel does not count.</li>
            </ul>
            {plan.rules.qualifies && plan.move && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={deanMoves} onChange={(event) => setDeanMoves(event.target.checked)} />
                Plan as if your college dean postpones {plan.move.name}
              </label>
            )}
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={holyDay} onChange={(event) => setHolyDay(event.target.checked)} />
                Religious holy day
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={varsity} onChange={(event) => setVarsity(event.target.checked)} />
                Intercollegiate varsity
              </label>
            </div>
            {plan.email && (
              <div>
                <Button variant="outline" size="sm" onClick={() => setShowEmail((open) => !open)}>
                  {showEmail ? "Hide note" : "Draft the note"}
                </Button>
                {showEmail && <p className="mt-3 text-sm leading-relaxed">{plan.email}</p>}
              </div>
            )}
          </section>
        )}
        {tab === "courses" && (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Courses</h2>
              <Button size="sm" onClick={() => { setAdding(true); setFormError("") }}>
                Add a course
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {courses.map((course) => {
                const slot = slotFor(course.group)
                const active = course.id === selected?.id
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(course.id)}
                      className={`w-full border px-3 py-3 text-left ${active ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-medium">{course.designation ? `${course.designation} · ` : ""}{course.name}</span>
                          <span className={`mt-1 block text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {slot ? `Group ${course.group} · ${slot.shortDay} · ${slot.time}` : course.group === "0" ? "Group 0 · term essay, no exam slot" : "Group 50 · time arranged"}
                            {" · "}
                            {formatLabel(course.format)}
                            {" · "}
                            {hoursFor(course, notes)}h
                          </span>
                        </span>
                        {plan.move?.id === course.id && plan.rules.qualifies && (
                          <span className={`text-xs ${active ? "text-primary-foreground" : "text-destructive"}`}>Move this</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
              {courses.length === 0 && (
                <li className="border border-dashed border-foreground/20 px-3 py-6 text-sm text-muted-foreground">
                  No courses yet. Add the ones you are actually taking, or load the sample load.
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetSample}>
                Load the sample load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCourses([])
                  setSelectedId("")
                }}
              >
                Clear courses
              </Button>
            </div>

            {selected && (
              <CoursePanel
                course={selected}
                notes={selectedNotes}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                formError={formError}
                onNoteChange={(note) =>
                  setCourses((current) => current.map((course) => (course.id === selected.id ? { ...course, note } : course)))
                }
                onInstructor={(instructor) =>
                  setCourses((current) => current.map((course) => (course.id === selected.id ? { ...course, instructor } : course)))
                }
                onRemove={() => {
                  setCourses((current) => current.filter((course) => course.id !== selected.id))
                }}
                onAddNote={addNote}
                onDeleteNote={(id) => setNotes((current) => current.filter((note) => note.id !== id))}
              />
            )}
          </section>
        </>
        )}
      </main>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a course</DialogTitle>
            <DialogDescription>Exam group from Yale Course Search.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Course">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="PHYS 1800" />
            </Field>
            <Field label="Instructor of record">
              <Input value={draft.instructor} onChange={(event) => setDraft({ ...draft, instructor: event.target.value })} placeholder="From the syllabus, not the TF" />
            </Field>
            <Field label="Distributional designation">
              <Select
                value={draft.designation}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, designation: value as Designation })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((designation) => (
                    <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Exam group">
              <Select
                value={draft.group}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, group: value })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.group} value={option.group}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What you will sit">
              <Select
                value={draft.format}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, format: value as FormatId })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={addCourse}>Add to the grid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExamGrid({
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl">The grid</h2>
      <div className="flex flex-col gap-4 md:hidden">
        {GRID_DAYS.slice(0, 4).map((day) => (
          <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />
        ))}
        <p className="border border-dashed border-foreground/20 px-3 py-3 text-sm text-muted-foreground">
          Saturday and Sunday, December 19–20. The Programs of Study schedule no final examinations on the weekend. Tuesday at 7:00 p.m. is makeup examinations only.
        </p>
        {GRID_DAYS.slice(4).map((day) => (
          <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[5.5rem_repeat(4,1fr)_8rem_repeat(2,1fr)] gap-1">
            <div />
            {GRID_DAYS.slice(0, 4).map((day) => (
              <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>
            ))}
            <div className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dec 19–20</div>
            {GRID_DAYS.slice(4).map((day) => (
              <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>
            ))}
            {TIME_LABELS.map((time, timeIndex) => (
              <GridRow
                key={time}
                time={time}
                timeIndex={timeIndex}
                courses={courses}
                selectedId={selectedId}
                moveId={moveId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GridRow({
  time,
  timeIndex,
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  time: string
  timeIndex: number
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  const cells = [
    ...GRID_DAYS.slice(0, 4).map((day) => day.times[timeIndex]),
    "weekend" as const,
    ...GRID_DAYS.slice(4).map((day) => day.times[timeIndex]),
  ]
  return (
    <>
      <div className="py-2 text-xs text-muted-foreground">{time}</div>
      {cells.map((group, index) => {
        if (group === "weekend") {
          return (
            <div key={`${time}-weekend`} className="border border-dashed border-foreground/15 bg-muted/60 px-2 py-2 text-xs leading-snug text-muted-foreground">
              {timeIndex === 1 ? "No final examinations." : ""}
            </div>
          )
        }
        const caption = group === "makeup" ? "Makeup only" : group ? null : "No exam"
        const matches = group && group !== "makeup" ? courses.filter((course) => course.group === group) : []
        return (
          <div key={`${time}-${index}`} className="min-h-16 border border-foreground/10 bg-card p-1.5">
            {caption && <span className="text-xs text-muted-foreground/60">{caption}</span>}
            {!caption && matches.length === 0 && <span className="text-xs text-muted-foreground/40" />}
            {matches.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelect(course.id)}
                className={`mb-1 block w-full px-1.5 py-1 text-left text-xs leading-snug ${
                  course.id === selectedId
                    ? "bg-primary text-primary-foreground"
                    : course.id === moveId
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10"
                }`}
              >
                {course.name}
              </button>
            ))}
          </div>
        )
      })}
    </>
  )
}

function DayStack({
  day,
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  day: { short: string; times: (string | null)[] }
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="border border-foreground/15 bg-card">
      <p className="border-b border-foreground/10 px-3 py-2 text-xs font-medium tracking-wide uppercase">{day.short}</p>
      {day.times.map((group, index) => {
        const caption = group === "makeup" ? "Makeup only" : group ? null : "No exam"
        const matches = group && group !== "makeup" ? courses.filter((course) => course.group === group) : []
        return (
          <div key={TIME_LABELS[index]} className="flex items-start gap-3 border-t border-foreground/10 px-3 py-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{TIME_LABELS[index]}</span>
            <div className="flex flex-1 flex-col gap-1">
              {caption && <span className="text-xs text-muted-foreground/60">{caption}</span>}
              {!caption && matches.length === 0 && <span className="text-xs text-muted-foreground/60">Open</span>}
              {matches.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={`px-2 py-1 text-left text-sm ${course.id === selectedId ? "bg-primary text-primary-foreground" : course.id === moveId ? "bg-destructive/15 text-destructive" : "bg-primary/10"}`}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CoursePanel({
  course,
  notes,
  noteDraft,
  setNoteDraft,
  formError,
  onNoteChange,
  onInstructor,
  onRemove,
  onAddNote,
  onDeleteNote,
}: {
  course: Course
  notes: ExamNote[]
  noteDraft: { showedUp: string; prepare: string; hours: string; season: string }
  setNoteDraft: (value: { showedUp: string; prepare: string; hours: string; season: string }) => void
  formError: string
  onNoteChange: (note: string) => void
  onInstructor: (instructor: string) => void
  onRemove: () => void
  onAddNote: () => void
  onDeleteNote: (id: string) => void
}) {
  const slot = slotFor(course.group)
  return (
    <div className="flex flex-col gap-4 border border-foreground/15 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl">{course.designation ? `${course.designation} · ` : ""}{course.name}</h3>
          <p className="text-xs text-muted-foreground">
            {slot ? `Group ${course.group} · ${slot.day}, ${slot.time}` : course.group === "0" ? "Group 0 · term essay or other final exercise, no regular exam" : "Group 50 · HTBA, time from the syllabus"}
            {" · "}
            {formatLabel(course.format)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <Field label="Instructor of record, for matching notes">
        <Input value={course.instructor} onChange={(event) => onInstructor(event.target.value)} placeholder="From the syllabus, not the TF" />
      </Field>
      <Field label="Your own prep note">
        <Textarea
          value={course.note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="What you still do not understand"
          rows={3}
        />
      </Field>
      <div>
        <h4 className="text-sm font-medium">What students remember</h4>
        <p className="mt-1 text-xs text-muted-foreground">Samples are labeled. Your notes stay on this device.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="border-t border-foreground/10 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {note.sample ? "Sample" : "Your note"} · {note.season}
                {note.instructor ? ` · ${note.instructor}` : ""}
              </p>
              {!note.sample && (
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => onDeleteNote(note.id)}>
                  Delete
                </button>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed">{note.showedUp}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note.prepare}</p>
            <p className="mt-1 text-xs">{note.hours}h · {formatLabel(note.format)}</p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-sm text-muted-foreground">No notes for this exam group yet.</li>
        )}
      </ul>
      <div className="flex flex-col gap-3 border-t border-foreground/10 pt-3">
        <h4 className="text-sm font-medium">Leave a note for this exam group</h4>
        <Field label="What actually showed up">
          <Textarea
            value={noteDraft.showedUp}
            onChange={(event) => setNoteDraft({ ...noteDraft, showedUp: event.target.value })}
            rows={2}
            maxLength={400}
          />
        </Field>
        <Field label="How to spend reading period">
          <Textarea
            value={noteDraft.prepare}
            onChange={(event) => setNoteDraft({ ...noteDraft, prepare: event.target.value })}
            rows={2}
            maxLength={400}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours it took">
            <Input
              type="number"
              min={1}
              max={40}
              value={noteDraft.hours}
              onChange={(event) => setNoteDraft({ ...noteDraft, hours: event.target.value })}
            />
          </Field>
          <Field label="When">
            <Input
              value={noteDraft.season}
              onChange={(event) => setNoteDraft({ ...noteDraft, season: event.target.value })}
              maxLength={40}
            />
          </Field>
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="button" onClick={onAddNote}>
          Use this in the plan
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isCourse(value: Course): boolean {
  return Boolean(value && typeof value.id === "string" && typeof value.name === "string" && typeof value.group === "string")
}

function isNote(value: ExamNote): boolean {
  return Boolean(value && typeof value.id === "string" && typeof value.prepare === "string")
}
