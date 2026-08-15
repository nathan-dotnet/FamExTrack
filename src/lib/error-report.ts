type ErrorContext = Record<string, unknown>;

export function reportError(
  error: unknown,
  context: ErrorContext = {},
): void {
  console.error("[FamExTrack Error]", error, context);
}