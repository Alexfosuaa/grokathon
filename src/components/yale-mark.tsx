export function YaleMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="YLearn">
      <rect width="32" height="32" rx="7" fill="#00356B" />
      <path d="M7.5 7.5h4.1l4.4 8.6 4.4-8.6h4.1L17.8 18.2V24h-3.6v-5.8L7.5 7.5z" fill="#ffffff" />
    </svg>
  )
}
