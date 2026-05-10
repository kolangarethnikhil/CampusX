import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

const BUCKET = "campusx-images";

const ALLOWED_FOLDERS = new Set(["profiles", "housing", "marketplace"]);

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

    const { folder, contentType } = req.body as {
      folder?: string;
      contentType?: string;
    };

    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return res.status(400).json({
        error: `Invalid folder. Must be one of: ${[...ALLOWED_FOLDERS].join(", ")}`,
      });
    }

    const extension = contentType ? ALLOWED_TYPES[contentType] : undefined;

    if (!extension) {
      return res.status(400).json({
        error: "Invalid content type. Must be image/jpeg, image/png, or image/webp",
      });
    }

    getFirebaseAdmin();

    const firebaseToken = authHeader.slice("Bearer ".length);
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

    const uid = decodedToken.uid;
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const path = `${uid}/${folder}/${fileName}`;

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return res.status(500).json({
        error: error?.message ?? "Failed to create signed upload URL",
      });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return res.status(200).json({
      path,
      token: data.token,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (error) {
    console.error("[create-signed-upload-url]", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Upload URL failed",
    });
  }
}