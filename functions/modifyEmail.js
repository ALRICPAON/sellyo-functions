const { onRequest } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init"); // ✅ import commun
const fetch = require("node-fetch");

const db = admin.firestore();

exports.modifyEmail = onRequest(async (req, res) => {
  try {
    const emailId = req.body.emailId;
    const updates = req.body.updates;

    if (!emailId || !updates) {
      return res.status(400).json({ error: "emailId et updates requis" });
    }

    // ✅ Mise à jour dans Firestore
    await db.collection("emails").doc(emailId).update(updates);

    // ✅ Appel sécurisé au webhook Make
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
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
