export const APPOINTMENT_STATUS_LABELS = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    arrived: "Arrived",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
};
export const APPOINTMENT_STATUS_TRANSITIONS = {
    scheduled: ["confirmed", "cancelled", "no_show"],
    confirmed: ["arrived", "cancelled", "no_show"],
    arrived: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
};
