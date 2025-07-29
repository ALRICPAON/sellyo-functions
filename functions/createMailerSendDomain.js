const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");

exports.createMailerSendDomain = onRequest(
  {
    cors: true,
    secrets: ["MAILERSEND_API_KEY"]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: "Domaine manquant dans la requête" });
    }

    logger.info("🔐 Vérification API_KEY MailerSend :", !!process.env.MAILERSEND_API_KEY);
    logger.info("🌐 Domaine reçu :", domain);

    try {
      const response = await fetch("https://api.mailersend.com/v1/domain-identities", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: domain,
          domain_type: "custom",
          dkim_selector: "mailersend"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("❌ Erreur API MailerSend :", data);
        return res.status(400).json({ error: data?.message || "Erreur API inconnue" });
      }

      logger.info("✅ Domaine MailerSend créé :", {
        id: data.id,
        domain: data.name,
        dns: data.dns?.records
      });

      return res.status(200).json({
        id: data.id,
        domain: data.name,
        dns: data.dns?.records || []
      });
    } catch (err) {
      logger.error("❌ Erreur serveur interne :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la création du domaine" });
    }
  }
);
