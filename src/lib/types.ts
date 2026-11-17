import type { FormatId } from "@/lib/catalog"

export type Course = {
  id: string
  name: string
  instructor: string
  group: string
  format: FormatId
  note: string
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
