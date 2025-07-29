const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");

exports.createCustomDomainNetlify = onRequest(
  {
    cors: true,
    secrets: ["NETLIFY_API_KEY"]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: "Domaine manquant" });
    }

    const siteId = "9ddc62c5-0744-4ba5-90d1-0f53f89c7acf"; // ✅ ID Netlify Sellyo
    const token = process.env.NETLIFY_API_KEY;

    try {
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: domain })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("❌ Erreur API Netlify :", data);
        return res.status(400).json({ error: data.message || "Erreur API Netlify" });
      }

      logger.info("✅ Domaine personnalisé ajouté :", data);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      logger.error("❌ Erreur serveur :", err);
      return res.status(500).json({ error: "Erreur interne serveur" });
    }
  }
);
