import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";
import sharp from "sharp";

const BUCKET = "campusx-images";
const MAX_INPUT_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

const ALLOWED_FOLDERS = new Set(["profiles", "housing", "marketplace"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encoded) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8")
  );

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function readRequestBuffer(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const folder = String(req.headers["x-campusx-folder"] || "");
    const contentType = String(req.headers["content-type"] || "");

    if (!ALLOWED_FOLDERS.has(folder)) {
      return res.status(400).json({
        error: "Invalid folder. Use profiles, housing, or marketplace.",
      });
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return res.status(400).json({
        error: "Invalid image type. Use JPG, PNG, or WebP.",
      });
    }

    getFirebaseAdmin();

    const firebaseToken = authHeader.slice("Bearer ".length);
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const uid = decodedToken.uid;

    const inputBuffer = await readRequestBuffer(req);

    if (!inputBuffer.length) {
      return res.status(400).json({ error: "Image file is empty." });
    }

    if (inputBuffer.length > MAX_INPUT_SIZE) {
      return res.status(400).json({ error: "Image must be under 5MB." });
    }

    const outputBuffer = await sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 74,
        effort: 5,
      })
      .toBuffer();

    const fileName = `${crypto.randomUUID()}.webp`;
    const path = `${uid}/${folder}/${fileName}`;

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, outputBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({
      path,
      publicUrl: data.publicUrl,
      originalBytes: inputBuffer.length,
      compressedBytes: outputBuffer.length,
      contentType: "image/webp",
    });
  } catch (error) {
    console.error("[upload-image]", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Image upload failed",
    });
  }
}