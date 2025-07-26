const { onRequest } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

const db = admin.firestore();

exports.modifyEmail = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const emailId = req.body.emailId;
      const updates = req.body.updates;

      if (!emailId || !updates) {
        console.error("❌ emailId ou updates manquants");
        return res.status(400).json({ error: "emailId et updates requis" });
      }

      await db.collection("emails").doc(emailId).update(updates);
      console.log(`✅ Email ${emailId} mis à jour`);

      const makeWebhookUrl = process.env.MAKE_WEBHOOKEDITMAIL_URL;
      if (!makeWebhookUrl) {
        console.warn("⚠️ MAKE_WEBHOOKEDITMAIL_URL non défini dans les variables d’environnement");
        return res.status(200).json({ success: true, warning: "Aucun webhook déclenché" });
      }

      // 🔁 Appel du webhook Make
      const response = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });

      const result = await response.text();
      console.log("📤 Webhook Make déclenché :", result);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Erreur modifyEmail :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });
});
