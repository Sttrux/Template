export function logInfo(event: string, data: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ level: "info", event, ...data }));
}

export function logError(event: string, error: unknown) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
}
