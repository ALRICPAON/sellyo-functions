const { onRequest } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

const db = admin.firestore();

exports.modifyScript = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const scriptId = req.body.scriptId;
      const updates = req.body.updates;

      if (!scriptId || !updates) {
        return res.status(400).json({ error: "scriptId et updates requis" });
      }

      // 🔄 Met à jour le Firestore dans `scripts/{uid}/items/{scriptId}`
      const userId = updates.userId;
      if (!userId) {
        return res.status(400).json({ error: "userId requis dans updates" });
      }

      await db
        .collection("scripts")
        .doc(userId)
        .collection("items")
        .doc(scriptId)
        .update(updates);

      // 📡 Envoie du webhook complet à Make
      const makeWebhookUrl = process.env.MAKE_WEBHOOKEDITMAIL_URL;
      if (makeWebhookUrl) {
        const payload = {
          id: scriptId,
          ...updates, // inclut html, name, type, etc.
        };

        await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Erreur modifyScript :", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });
});
