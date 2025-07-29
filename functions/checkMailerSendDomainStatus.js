const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init"); // ✅ Import centralisé
const db = admin.firestore();

exports.checkMailerSendDomainStatus = onRequest(
  {
    cors: true,
    secrets: ["MAILERSEND_API_KEY"]
  },
  async (req, res) => {
    const { domainId, userId } = req.body;

    if (!domainId) {
      return res.status(400).json({ error: "❌ DomaineId manquant" });
    }

    try {
      const response = await fetch(`https://api.mailersend.com/v1/domain-identities/${domainId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("❌ Erreur MailerSend :", data);
        return res.status(400).json({ error: data?.message || "Erreur API" });
      }

      const isDKIMVerified = data.dkim?.status === "verified";
      const isSPFVerified = data.spf?.status === "verified";
      const isVerified = isDKIMVerified && isSPFVerified;
      const newStatus = isVerified ? "validated" : "pending";

      // 🔄 Mise à jour Firestore si userId fourni
      if (userId) {
        await db.doc(`users/${userId}`).set({
          emailDomain: {
            domainId,
            status: newStatus
          }
        }, { merge: true });
      }

      return res.status(200).json({
        validated: isVerified,
        dkim: data.dkim?.status,
        spf: data.spf?.status,
        updated: !!userId
      });

    } catch (err) {
      logger.error("❌ Erreur serveur :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);
