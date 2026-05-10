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

  return Promise.all(files.map((file) => uploadImage(file, user.uid, folder)));
}

export async function uploadProfilePhoto(file: File, userId?: string): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to upload a profile photo.");
  }

  if (userId && user.uid !== userId) {
    throw new Error("You can only upload your own profile photo.");
  }

  return uploadImage(file, user.uid, "profiles");
}

async function uploadImage(
  file: File,
  userId: string,
  folder: ImageFolder
): Promise<string> {
  validateImage(file);

  const extension = getFileExtension(file);
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const path = `${userId}/${folder}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return data.publicUrl;
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

function getFileExtension(file: File): string {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  throw new Error("Unsupported image type.");
}