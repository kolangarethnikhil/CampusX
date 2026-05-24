import type { VercelRequest, VercelResponse } from "@vercel/node";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    console.log("WhatsApp webhook:", JSON.stringify(req.body, null, 2));

    return res.status(200).json({
      ok: true,
    });
  }

  return res.status(405).json({
    error: "Method not allowed",
  });
}