import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";
export function formatDate(date, pattern = "PPP") {
    return format(new Date(date), pattern);
}
export function formatRelative(date) {
    const d = new Date(date);
    if (isToday(d))
        return "Today";
    if (isTomorrow(d))
        return "Tomorrow";
    if (isYesterday(d))
        return "Yesterday";
    return formatDistanceToNow(d, { addSuffix: true });
}
export function formatTime(date) {
    return format(new Date(date), "h:mm a");
}
export function formatDateTime(date) {
    return format(new Date(date), "PPp");
}
