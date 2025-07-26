const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true }); // ✅ CORS autorisé pour tous

const db = admin.firestore();

exports.modifyEmail = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const emailId = req.body.emailId;
      const updates = req.body.updates;

      if (!emailId || !updates) {
        return res.status(400).json({ error: "emailId et updates requis" });
      }

      await db.collection("emails").doc(emailId).update(updates);

      const makeWebhookUrl = functions.config().make.webhookeditmail_url;
      if (makeWebhookUrl) {
        await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId }),
        });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Erreur modifyEmail :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });
});
