exports.modifyEmail = onRequest(
  {
    region: "us-central1",
    memory: "256Mi",
    cpu: 1,
    timeoutSeconds: 60,
    secrets: ["MAKE_WEBHOOK_URL"] // ✅ Ajoute ceci
  },
  (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).send("Méthode non autorisée");
        }

        const { id, html, name, type } = req.body;
        if (!id || !html || !name || !type) {
          return res.status(400).send("Paramètres manquants");
        }

        const makeWebhookURL = process.env.MAKE_WEBHOOK_URL; // ✅ utilisation directe

        if (!makeWebhookURL) {
          return res.status(500).send("❌ Webhook Make non défini (secret manquant)");
        }

        const response = await axios.post(makeWebhookURL, {
          id,
          html,
          name,
          type,
        });

        if (response.status === 200) {
          return res.status(200).send("✅ Email modifié avec succès");
        } else {
          return res.status(500).send("❌ Erreur lors de l’appel Make");
        }
      } catch (error) {
        console.error("❌ Erreur modifyEmail :", error);
        return res.status(500).send("❌ Erreur serveur");
      }
    });
  }
);
