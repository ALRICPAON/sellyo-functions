const functions = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");

const netlifyApiKey = functions.config().netlify?.api_key;

exports.createCustomDomainNetlify = onRequest(
  {
    cors: true,
    region: "europe-west1",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Méthode non autorisée");
    }

    if (!netlifyApiKey) {
      return res.status(500).json({ error: "Clé Netlify non configurée." });
    }

    const { userId, customDomain } = req.body;
    if (!userId || !customDomain) {
      return res.status(400).json({ error: "Champs manquants." });
    }

    // Exemple d'appel API Netlify avec netlifyApiKey ici...

    res.json({ ok: true, message: "Domaine enregistré avec succès (mock)." });
  }
);
