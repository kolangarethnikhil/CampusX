import type { VercelRequest, VercelResponse } from "@vercel/node";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendWhatsAppText(to: string, body: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Missing WhatsApp env vars");
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: true,
          body,
        },
      }),
    }
  );

  if (!response.ok) {
    console.error("WhatsApp send failed:", await response.text());
  }
}

function getBotReply(text: string) {
  const message = text.trim().toLowerCase();

  if (["hi", "hello", "menu", "start"].includes(message)) {
    return `Hey 👋 Welcome to CampusX.

Find rooms, roommates, PGs and essentials around KJU without WhatsApp chaos.

Reply with:

1️⃣ Rooms / PGs near KJU
2️⃣ Buy or sell essentials
3️⃣ Post a listing
4️⃣ Latest listings
5️⃣ Help / report issue`;
  }

  if (["1", "rooms", "room", "pg", "housing"].includes(message)) {
    return `🏠 Rooms near KJU

Open CampusX:
https://campus-x.app/?tab=housing

You can check location, save posts, share, and ping owners directly.`;
  }

  if (["2", "items", "item", "essentials", "market"].includes(message)) {
    return `🛋️ Essentials

Buy/sell mattress, table, books, electronics and more:
https://campus-x.app/?tab=market`;
  }

  if (["3", "post", "sell", "add"].includes(message)) {
    return `Post your room, PG, roommate requirement or item here:
https://campus-x.app/?intent=post

If posting is difficult, send:
photos + price/rent + location + contact details.`;
  }

  if (["4", "latest", "listings"].includes(message)) {
    return `Latest CampusX listings are available here:

🏠 Rooms:
https://campus-x.app/?tab=housing

🛋️ Essentials:
https://campus-x.app/?tab=market

Soon I’ll show latest posts directly inside WhatsApp.`;
  }

  if (["5", "help", "support", "issue"].includes(message)) {
    return `Need help with CampusX?

You can:
- Report a listing inside the app
- Send issue details here
- Open CampusX: https://campus-x.app

For rooms/items, always check details before paying anyone.`;
  }

  return `I didn’t understand that.

Reply with:
1 - Rooms / PGs
2 - Essentials
3 - Post listing
4 - Latest listings
5 - Help`;
}

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
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const messages = value?.messages;

    if (Array.isArray(messages)) {
      for (const message of messages) {
        const from = message.from;
        const text = message.text?.body;

        if (from && text) {
          const reply = getBotReply(text);
          await sendWhatsAppText(from, reply);
        }
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}