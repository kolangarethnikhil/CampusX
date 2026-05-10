import { auth } from "../lib/firebase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type ImageFolder = "profiles" | "housing" | "marketplace";

export async function uploadMultipleImages(
  files: File[],
  folder: "housing" | "marketplace"
): Promise<string[]> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to upload images.");
  }

  return Promise.all(files.map((file) => uploadImage(file, folder)));
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

  return uploadImage(file, "profiles");
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

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5MB.");
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}