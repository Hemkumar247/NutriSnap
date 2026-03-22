import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Limit users to 20 calls per hour for cost control
const MAX_REQUESTS_PER_HOUR = 20;

/**
 * Checks and increments the rate limit for a user in Firestore.
 * Never throws — if Firestore fails, it defaults to allowing the request through.
 */
export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // Window = current hour (e.g., 2PM, 3PM)
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const windowId = now.toISOString();

    const statsRef = adminDb.collection('rate_limits').doc(userId);
    const windowRef = statsRef.collection('windows').doc(windowId);

    let count = 1;

    // Transaction ensures accurate incrementing
    await adminDb.runTransaction(async (t) => {
      const doc = await t.get(windowRef);
      if (doc.exists) {
        count = (doc.data()?.requestCount || 0) + 1;
        t.update(windowRef, {
          requestCount: FieldValue.increment(1),
          updatedAt: new Date(),
        });
      } else {
        count = 1;
        t.set(windowRef, {
          userId,
          windowStart: windowId,
          requestCount: 1,
          updatedAt: new Date(),
        });
      }
    });

    return {
      allowed: count <= MAX_REQUESTS_PER_HOUR,
      remaining: Math.max(0, MAX_REQUESTS_PER_HOUR - count),
    };
  } catch (error) {
    console.error('[rateLimiter] Error during check:', error);
    // Never block legitimate requests because the rate limiter failed
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR };
  }
}
