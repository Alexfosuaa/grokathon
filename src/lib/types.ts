import type { FormatId } from "@/lib/catalog"

export const GRADE_TARGETS = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "CR"] as const
export type GradeTarget = (typeof GRADE_TARGETS)[number]

/** Distributional designations from the Yale College Programs of Study. */
export const DESIGNATIONS = ["L1", "L2", "L3", "L4", "L5", "HU", "SO", "SC", "QR", "WR"] as const
export type Designation = (typeof DESIGNATIONS)[number]

export type Course = {
  id: string
  name: string
  instructor: string
  group: string
  format: FormatId
  note: string
  designation?: Designation
  targetGrade?: GradeTarget
  /** Syllabus percentage for the target. Unset means the planning default. */
  cutoff?: number
}

export type PrepLog = {
  id: string
  courseId: string
  date: string
  minutes: number
  sample?: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  courseId: string | null
  kind: "assignment" | "exam" | "personal"
  source: "manual" | "canvas"
  sample?: boolean
}

export type ExamNote = {
  id: string
  examGroup: string
  courseName: string
  instructor: string
  format: FormatId
  showedUp: string
  prepare: string
  hours: number
  season: string
  sample: boolean
}
