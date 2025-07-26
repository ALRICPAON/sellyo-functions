const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

const db = admin.firestore();
const MAKE_WEBHOOKEDITMAIL_URL = defineSecret("MAKE_WEBHOOKEDITMAIL_URL");

exports.modifyEmail = onRequest(
  { secrets: [MAKE_WEBHOOKEDITMAIL_URL] }, // ✅ On attache le secret ici
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const emailId = req.body.emailId;
        const updates = req.body.updates;

        if (!emailId || !updates) {
          return res.status(400).json({ error: "emailId et updates requis" });
        }

        await db.collection("emails").doc(emailId).update(updates);

        const webhookUrl = MAKE_WEBHOOKEDITMAIL_URL.value();
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailId }),
          });
        } else {
          return res.status(200).json({ success: true, warning: "Aucun webhook déclenché" });
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error("Erreur modifyEmail :", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }
    });
  }
);
