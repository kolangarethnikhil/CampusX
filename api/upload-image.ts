import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getListingBucketName, getSupabaseAdmin } from "./lib/supabaseAdmin";
import { verifyBearerToken } from "./lib/firebaseAdmin";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getExtension(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

function decodeBase64(base64: string) {
  const cleanBase64 = base64.includes(",") ? base64.split(",").pop() || "" : base64;
  return Buffer.from(cleanBase64, "base64");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const decodedToken = await verifyBearerToken(req.headers.authorization);

    const {
      fileName,
      contentType,
      base64,
      folder = "listings",
    } = req.body || {};

    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({
        error: "Missing fileName.",
      });
    }

    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({
        error: "Missing contentType.",
      });
    }

    if (!allowedContentTypes.has(contentType)) {
      return res.status(400).json({
        error: "Only JPG, PNG and WEBP images are allowed.",
      });
    }

    if (!base64 || typeof base64 !== "string") {
      return res.status(400).json({
        error: "Missing image data.",
      });
    }

    const buffer = decodeBase64(base64);

    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: "Image must be smaller than 5MB.",
      });
    }

    const supabase = getSupabaseAdmin();
    const bucket = getListingBucketName();
    const extension = getExtension(contentType);

    const safeFolder = String(folder)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const path = `${safeFolder}/${decodedToken.uid}/${Date.now()}-${randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("Supabase upload failed:", error);
      return res.status(500).json({
        error: "Image upload failed.",
      });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return res.status(200).json({
      path,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    console.error("upload-image failed:", error);

    return res.status(401).json({
      error: error instanceof Error ? error.message : "Unauthorized",
    });
  }
}