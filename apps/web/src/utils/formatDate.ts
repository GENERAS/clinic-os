import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns"

export function formatDate(date: string | Date, pattern = "PPP") {
  return format(new Date(date), pattern)
}

export function formatRelative(date: string | Date) {
  const d = new Date(date)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  if (isYesterday(d)) return "Yesterday"
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatTime(date: string | Date) {
  return format(new Date(date), "h:mm a")
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "PPp")
}
