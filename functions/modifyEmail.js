const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

exports.modifyEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Méthode non autorisée");
      }

      const { id, html, name, type } = req.body;
      if (!id || !html || !name || !type) {
        return res.status(400).send("Paramètres manquants");
      }

      const makeWebhookURL = functions.config().make.webhook_url;

      const response = await axios.post(makeWebhookURL, { id, html, name, type });

      if (response.status === 200) {
        return res.status(200).send("Email modifié avec succès");
      } else {
        return res.status(500).send("Erreur lors de l’appel Make");
      }
    } catch (error) {
      console.error("Erreur modifyEmail:", error);
      return res.status(500).send("Erreur serveur");
    }
  });
});
