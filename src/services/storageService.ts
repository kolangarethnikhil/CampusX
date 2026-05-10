import { auth } from "../lib/firebase";
import { supabase } from "../lib/supabase";

const BUCKET = "campusx-images";
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

  const signedUrlResponse = await fetch("/api/create-signed-upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify({
      folder,
      contentType: file.type,
    }),
  });

  const signedUrlPayload = await signedUrlResponse.json();

  if (!signedUrlResponse.ok) {
    throw new Error(
      signedUrlPayload?.error || "Could not create signed upload URL."
    );
  }

  const { path, token, publicUrl } = signedUrlPayload as {
    path: string;
    token: string;
    publicUrl: string;
  };

  console.log("Uploading with signed URL:", {
    bucket: BUCKET,
    path,
    type: file.type,
    size: file.size,
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type,
    });

  if (error) {
    console.error("Supabase signed upload error:", error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return publicUrl;
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