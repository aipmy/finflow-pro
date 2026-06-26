import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file. If the file is not an image, it returns the original file.
 * @param file The file to compress
 * @returns The compressed file (or original if not an image or if compression fails)
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 1,          // Target max size 1MB
    maxWidthOrHeight: 1280, // Max dimension 1280px
    useWebWorker: true,
    initialQuality: 0.75,   // 75% quality
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob back to File to preserve name and lastModified
    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // fallback to original file if compression fails
  }
}
