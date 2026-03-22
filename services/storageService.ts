/**
 * Uploads a food image buffer to Cloudinary.
 * Called from app/api/analyze/image/route.ts after analysis.
 * Returns the permanent secure_url.
 */
export async function uploadFoodImage(
  userId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('upload_preset', 'nutrisnap_food');
  formData.append('folder', `food-images/${userId}`);
  formData.append('public_id', crypto.randomUUID());

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Cloudinary upload failed: ${err.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}

/**
 * Deletes a food image from Cloudinary.
 * Called when a food log entry is deleted.
 * Never throws — logs errors silently so log deletion always succeeds.
 */
export async function deleteFoodImage(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from URL
    // Format: https://res.cloudinary.com/{cloud}/image/upload/v{n}/{public_id}.ext
    const uploadIdx = imageUrl.indexOf('/upload/');
    if (uploadIdx === -1) return;
    const afterUpload = imageUrl.slice(uploadIdx + 8); // skip "/upload/"
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const publicId = withoutVersion.replace(/\.[^/.]+$/, ''); // remove extension

    const timestamp = String(Math.floor(Date.now() / 1000));
    const sigString = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;

    // SHA-1 signature using Web Crypto
    const encoded = new TextEncoder().encode(sigString);
    const hashBuf = await crypto.subtle.digest('SHA-1', encoded);
    const signature = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const fd = new FormData();
    fd.append('public_id', publicId);
    fd.append('timestamp', timestamp);
    fd.append('api_key', process.env.CLOUDINARY_API_KEY!);
    fd.append('signature', signature);

    await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: 'POST', body: fd }
    );
  } catch (err) {
    console.error('[storageService.deleteFoodImage]', err);
  }
}
