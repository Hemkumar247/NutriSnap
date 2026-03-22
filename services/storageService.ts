import { adminStorage } from '@/lib/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Firebase Cloud Storage Service
 * Handles uploading and deleting food images in the 'food-images' bucket.
 * Server-only functions (uses firebase-admin).
 */

/**
 * Uploads a food image to Firebase Cloud Storage.
 * Returns the public download URL of the uploaded image.
 * Called server-side from the API route after food analysis.
 */
export async function uploadFoodImage(
  userId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const bucket = adminStorage.bucket();
    const fileName = `${userId}/${uuidv4()}.jpg`; // Storing as .jpg for standardization
    const file = bucket.file(`food-images/${fileName}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
      },
      public: true, // Making it publicly readable as per PRD requirements
    });

    // The public URL format for Firebase Storage:
    // https://storage.googleapis.com/[BUCKET_NAME]/[FILE_PATH]
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  } catch (error: any) {
    console.error('[storageService.uploadFoodImage] Error:', error);
    throw new Error(`Firebase Storage upload failed: ${error.message}`);
  }
}

/**
 * Deletes a food image from Firebase Cloud Storage.
 * Never throws — logs errors but does not block the caller.
 * Called when a food log entry is deleted.
 */
export async function deleteFoodImage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl) return;

    // Extract path from URL
    // URL format: https://storage.googleapis.com/[BUCKET_NAME]/food-images/[USER_ID]/[UUID].jpg
    const bucket = adminStorage.bucket();
    const urlParts = imageUrl.split(`${bucket.name}/`);
    if (urlParts.length < 2) return;

    const fileName = urlParts[1];
    const file = bucket.file(fileName);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  } catch (error) {
    console.error('[storageService.deleteFoodImage] Error:', error);
    // Do not throw — caller proceeds regardless
  }
}
