import { randomBytes, timingSafeEqual } from "node:crypto";

export function createCsrfToken() {
  return randomBytes(32).toString("base64url");
}

export function matchesCsrfToken(expected: string | undefined, received: string | undefined) {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
}
