// ✅ Fichier : createCustomDomainNetlify.js

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");

const admin = require("./firebase-admin-init");
const db = admin.firestore();

exports.createCustomDomainNetlify = onRequest(
  {
    cors: true,
    secrets: ["NETLIFY_API_KEY"],
    region: "europe-west1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const { customDomain, userId } = req.body;
    const netlifyToken = process.env.NETLIFY_API_KEY;

    if (!customDomain || !userId) {
      return res.status(400).json({ error: "Domaine ou userId manquant" });
    }

    logger.info("📩 Requête domaine Netlify :", { customDomain, userId });

    try {
      const siteId = "9ddc62c5-0744-4ba5-90d1-0f53f89c7acf"; // ← 🛑 À remplacer par ton vrai siteId Netlify

      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: customDomain }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("❌ Erreur API Netlify :", data);
        return res.status(400).json({ error: data.message || "Erreur API inconnue" });
      }

      logger.info("✅ Domaine rattaché à Netlify :", data);

      // 🔐 Enregistrement dans Firestore
      await db.doc(`users/${userId}`).set(
        {
          siteDomain: {
            domain: customDomain,
            createdAt: Date.now(),
            status: "pending",
          },
        },
        { merge: true }
      );

      return res.status(200).json({ success: true, domain: customDomain });
    } catch (err) {
      logger.error("🔥 Erreur serveur :", err);
      return res.status(500).json({ error: "Erreur serveur Netlify" });
    }
  }
);
