const { onRequest } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");

exports.createCustomDomainNetlify = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: ["NETLIFY_TOKEN"],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { userId, customDomain } = req.body;

    if (!userId || !customDomain) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Ici ta logique Netlify API

    return res.json({ ok: true, message: "Domain registered (mock)" });
  }
);
