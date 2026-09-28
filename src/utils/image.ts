/**
 * Client-side image compression and WebP optimization utility (Section 65).
 * Compresses large photos to WebP (or JPEG fallback) at a maximum dimension of 1200px
 * to prevent shipping oversized images while maintaining crisp legibility.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; mimeType: string; fileName: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = String(reader.result);
          resolve({
            dataUrl: raw,
            mimeType: file.type || 'image/jpeg',
            fileName: file.name,
            sizeBytes: file.size,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP for smaller payload; fallback to JPEG if browser does not encode WebP
        let outputMime = 'image/webp';
        let dataUrl = canvas.toDataURL(outputMime, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          outputMime = 'image/jpeg';
          dataUrl = canvas.toDataURL(outputMime, quality);
        }

        const base64Part = dataUrl.split(',')[1] || '';
        const sizeBytes = Math.round((base64Part.length * 3) / 4);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const ext = outputMime === 'image/webp' ? 'webp' : 'jpg';

        resolve({
          dataUrl,
          mimeType: outputMime,
          fileName: `${baseName}.${ext}`,
          sizeBytes,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
