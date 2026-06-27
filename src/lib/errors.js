const SYSTEM_ERROR_PATTERNS = [
  /Failed to fetch/i,
  /NetworkError/i,
  /Network Error/i,
  /TypeError/i,
  /SyntaxError/i,
  /ReferenceError/i,
  /dynamically imported module/i,
  /Loading chunk/i,
  /Unexpected token/i,
  /Unexpected end of input/i,
  /JSON/i,
  /undefined is not/i,
  /Cannot read property/i,
  /Cannot read properties/i,
];

function looksLikeSystemError(msg) {
  return SYSTEM_ERROR_PATTERNS.some((re) => re.test(msg));
}

export function handleApiError(err, fallbackMessage = "Something went wrong.") {
  console.error(`[ClinicOS] ${fallbackMessage}`, err);
  if (err?.code) console.error("  Code:", err.code);
  if (err?.details) console.error("  Details:", err.details);
  const msg = err?.message || "";
  if (msg && !looksLikeSystemError(msg)) {
    return msg;
  }
  return `${fallbackMessage} Please try again.`;
}
