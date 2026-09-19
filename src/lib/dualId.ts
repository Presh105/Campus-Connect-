/**
 * Dual ID Privacy System
 * - Primary ID (system_id): Permanent, visible only to admin
 * - Secondary/Public ID: Rotates every 5 minutes, derived from primary ID
 * - Admin can trace public ID back to primary ID
 */

const TIME_BUCKET_MS = 2 * 60 * 1000; // 2 minutes

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getTimeBucket(): number {
  return Math.floor(Date.now() / TIME_BUCKET_MS);
}

export function generatePublicId(systemId: string, timeBucket?: number): string {
  const bucket = timeBucket ?? getTimeBucket();
  const input = `${systemId}-${bucket}`;
  const hash = simpleHash(input);
  const hex = hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
  return `PUB-${hex}`;
}

/**
 * Admin function: trace a public ID back to the system ID
 * by testing all known system IDs against the current and recent time buckets
 */
export function tracePublicIdToSystemId(
  publicId: string,
  allSystemIds: string[]
): string | null {
  const currentBucket = getTimeBucket();
  // Check current and previous bucket (in case of timing edge)
  for (const bucket of [currentBucket, currentBucket - 1]) {
    for (const sid of allSystemIds) {
      if (generatePublicId(sid, bucket) === publicId) {
        return sid;
      }
    }
  }
  return null;
}

/**
 * Hook helper: returns seconds until next ID rotation
 */
export function getSecondsUntilRotation(): number {
  const now = Date.now();
  const nextBucket = (getTimeBucket() + 1) * TIME_BUCKET_MS;
  return Math.ceil((nextBucket - now) / 1000);
}
