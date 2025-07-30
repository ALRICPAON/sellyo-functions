const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const fetch = require("node-fetch");
const logger = require("firebase-functions/logger");

initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

exports.generateAIVideo = onRequest(
  {
    cors: true,
    secrets: ["RUNWAY_API_KEY"]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
      const { userId, scriptId } = req.body;

      if (!userId || !scriptId) {
        return res.status(400).json({ error: "userId et scriptId requis" });
      }

      // 🔹 Récupérer le script Firestore
      const scriptRef = db.collection("scripts").doc(userId).collection("items").doc(scriptId);
      const scriptSnap = await scriptRef.get();

      if (!scriptSnap.exists) {
        return res.status(404).json({ error: "Script introuvable" });
      }

      const data = scriptSnap.data();
      const promptUrl = data.promptVideoUrl;

      if (!promptUrl) {
        return res.status(400).json({ error: "Champ promptVideoUrl manquant" });
      }

      // 🔹 Télécharger le prompt texte
      const promptTextRes = await fetch(promptUrl);
      const promptText = await promptTextRes.text();

      const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

      // 🔸 Étape 1 : Génération de l’image
      const imageRes = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          promptText,
          model: "gen4_image",
          ratio: "1280:720",
          seed: 4294967295
        }),
      });

      const imageData = await imageRes.json();
      const imageTaskId = imageData.id;

      if (!imageTaskId) {
        throw new Error("Erreur génération image : ID manquant");
      }

      // 🔁 Étape 2 : Attente de l’image générée
      let imageUrl;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));

        const statusRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${imageTaskId}`, {
          headers: {
            Authorization: `Bearer ${RUNWAY_API_KEY}`,
            "X-Runway-Version": "2024-11-06",
          },
        });

        const statusData = await statusRes.json();

        if (statusData.status === "succeeded") {
          imageUrl = statusData.outputs?.[0]?.url;
          break;
        } else if (statusData.status === "failed") {
          throw new Error("❌ Échec génération image");
        }
      }

      if (!imageUrl) {
        throw new Error("⏳ Image non disponible après délai");
      }

      // 🔸 Étape 3 : Génération de la vidéo depuis l’image
      const videoRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          promptImage: imageUrl,
          model: "gen3a_turbo",
          promptText,
          duration: 5,
          ratio: "1280:720",
          seed: 4294967295
        }),
      });

      const videoData = await videoRes.json();
      const videoTaskId = videoData.id;

      if (!videoTaskId) {
        throw new Error("Erreur génération vidéo : ID manquant");
      }

      // 🔄 Mise à jour Firestore
      await scriptRef.update({
        runwayJobId: videoTaskId,
        generationStartedAt: Date.now(),
        status: "generating"
      });

      return res.status(200).json({ success: true, videoTaskId });

    } catch (err) {
      logger.error("❌ Erreur generateAIVideo:", err);
      return res.status(500).json({ error: err.message || "Erreur serveur" });
    }
  }
);
