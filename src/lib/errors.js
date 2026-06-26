export function handleApiError(err, fallbackMessage = "Something went wrong.") {
  console.error(`[ClinicOS] ${fallbackMessage}`, err);
  if (err?.code) console.error("  Code:", err.code);
  if (err?.details) console.error("  Details:", err.details);
  return `${fallbackMessage} Please try again.`;
}
