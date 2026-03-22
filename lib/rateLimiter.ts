import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_REQUESTS_PER_HOUR = 20;

/**
 * Increments and checks the rate limit for a user.
 * Uses a Firestore transaction so concurrent requests don't race.
 * Path: rate_limits/{userId}/windows/{windowId}
 * Never throws — if Firestore fails, the request is allowed through.
 */
export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const windowId = now.toISOString();

    const windowRef = adminDb
      .collection('rate_limits')
      .doc(userId)
      .collection('windows')
      .doc(windowId);

    let finalCount = 1;

    await adminDb.runTransaction(async (t) => {
      const snap = await t.get(windowRef);
      if (snap.exists) {
        finalCount = (snap.data()!.requestCount ?? 0) + 1;
        t.update(windowRef, {
          requestCount: FieldValue.increment(1),
          updatedAt: new Date(),
        });
      } else {
        finalCount = 1;
        t.set(windowRef, {
          userId,
          windowStart: windowId,
          requestCount: 1,
          updatedAt: new Date(),
        });
      }
    });

    return {
      allowed: finalCount <= MAX_REQUESTS_PER_HOUR,
      remaining: Math.max(0, MAX_REQUESTS_PER_HOUR - finalCount),
    };
  } catch (err) {
    console.error('[rateLimiter]', err);
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR };
  }
}
