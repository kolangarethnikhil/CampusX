import { auth } from "../lib/firebase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const CLIENT_MAX_DIMENSION = 1800;
const CLIENT_IMAGE_QUALITY = 0.82;
const UPLOAD_CONCURRENCY = 2;

type ImageFolder = "profiles" | "housing" | "marketplace";

type UploadProgress = {
  stage: "preparing" | "compressing" | "uploading" | "done";
  current: number;
  total: number;
};

type UploadProgressHandler = (progress: UploadProgress) => void;

export async function uploadMultipleImages(
  files: File[],
  folder: "housing" | "marketplace",
  onProgress?: UploadProgressHandler
): Promise<string[]> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to upload images.");
  }

  const total = files.length;

  onProgress?.({
    stage: "preparing",
    current: 0,
    total,
  });

  return uploadWithConcurrency(files, UPLOAD_CONCURRENCY, async (file, index) => {
    onProgress?.({
      stage: "compressing",
      current: index + 1,
      total,
    });

    const preparedFile = await prepareImageForUpload(file);

    onProgress?.({
      stage: "uploading",
      current: index + 1,
      total,
    });

    return uploadImage(preparedFile, folder);
  });
}

export async function uploadProfilePhoto(
  file: File,
  userId?: string
): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to upload a profile photo.");
  }

  if (userId && user.uid !== userId) {
    throw new Error("You can only upload your own profile photo.");
  }

  const preparedFile = await prepareImageForUpload(file);

  return uploadImage(preparedFile, "profiles");
}

async function uploadImage(file: File, folder: ImageFolder): Promise<string> {
  validateImage(file);

  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to upload images.");
  }

  const firebaseToken = await user.getIdToken(true);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseToken}`,
      "Content-Type": file.type,
      "x-campusx-folder": folder,
    },
    body: file,
  });

  const rawResponse = await response.text();

  let payload: {
    publicUrl?: string;
    path?: string;
    originalBytes?: number;
    compressedBytes?: number;
    error?: string;
  };

  try {
    payload = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `Upload API did not return JSON. Status: ${response.status}. Response: ${rawResponse.slice(
        0,
        140
      )}`
    );
  }

  if (!response.ok) {
    throw new Error(payload.error || "Image upload failed.");
  }

  if (!payload.publicUrl) {
    throw new Error("Upload response missing public URL.");
  }

  console.log("Server image compression:", {
    path: payload.path,
    original: formatBytes(payload.originalBytes || file.size),
    compressed: formatBytes(payload.compressedBytes || 0),
  });

  return payload.publicUrl;
}

async function uploadWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  );

  await Promise.all(workers);

  return results;
}

async function prepareImageForUpload(file: File): Promise<File> {
  validateImage(file);

  if (file.size < 450 * 1024) {
    return file;
  }

  const image = await loadImage(file);
  const { width, height } = getTargetDimensions(
    image.width,
    image.height,
    CLIENT_MAX_DIMENSION
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    return file;
  }

  context.fillStyle = "#111116";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const outputType = supportsWebp() ? "image/webp" : "image/jpeg";
  const blob = await canvasToBlob(canvas, outputType, CLIENT_IMAGE_QUALITY);

  if (blob.size >= file.size) {
    return file;
  }

  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const fileName = replaceExtension(file.name, extension);

  return new File([blob], fileName, {
    type: outputType,
    lastModified: Date.now(),
  });
}

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5MB.");
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };

    image.src = url;
  });
}

function getTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
) {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return {
      width: originalWidth,
      height: originalHeight,
    };
  }

  const ratio = Math.min(
    maxDimension / originalWidth,
    maxDimension / originalHeight
  );

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

function supportsWebp(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function replaceExtension(filename: string, extension: string): string {
  const base = filename.replace(/\.[^/.]+$/, "");
  return `${base || "campusx-image"}.${extension}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}