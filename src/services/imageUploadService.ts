import { auth } from "../lib/firebase";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadedImage {
  path: string;
  publicUrl: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result));
    };

    reader.onerror = () => {
      reject(new Error("Could not read image file."));
    };

    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Only JPG, PNG and WEBP images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Image must be smaller than 5MB.");
  }
}

export async function uploadImage(file: File, folder = "listings"): Promise<UploadedImage> {
  validateImageFile(file);

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sign in to upload images.");
  }

  const idToken = await user.getIdToken();
  const base64 = await fileToBase64(file);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      base64,
      folder,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Image upload failed.");
  }

  return data as UploadedImage;
}