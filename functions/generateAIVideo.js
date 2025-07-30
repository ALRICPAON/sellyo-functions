const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init");
const db = admin.firestore();

exports.generateAIVideo = onRequest({
  cors: true,
  secrets: ["RUNWAY_API_KEY"]
}, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { userId, scriptId } = req.body;
    if (!userId || !scriptId) throw new Error("Paramètres manquants.");

    // 🔥 1. Récupération des données du script
    const scriptRef = db.doc(`scripts/${userId}/items/${scriptId}`);
    const scriptSnap = await scriptRef.get();
    if (!scriptSnap.exists) throw new Error("Script introuvable.");
    const scriptData = scriptSnap.data();

    const promptUrl = scriptData.promptVideoUrl;
    if (!promptUrl) throw new Error("Aucun promptVideoUrl défini.");

    const promptText = await fetch(promptUrl).then(r => r.text());
    logger.info("📝 Prompt utilisé :", promptText);

    // 🖼️ 2. Génération de l’image avec le prompt texte
    const imageRes = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        promptText,
        model: "gen4_image", // ← tu peux aussi tester "gen3a_turbo"
        ratio: "1280:720",
        seed: 1234567890,
        contentModeration: {
          publicFigureThreshold: "auto"
        }
      })
    });

    if (!imageRes.ok) {
      const errorText = await imageRes.text();
      throw new Error("Erreur image Runway : " + errorText);
    }

    const imageData = await imageRes.json();
    const imageId = imageData.id;
    logger.info("🖼️ Image générée – ID :", imageId);

    // ⏳ Facultatif : attendre quelques secondes pour être sûr que l’image est prête
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 📽️ 3. Génération de la vidéo à partir de l’image
    const videoRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        promptImage: `https://storage.googleapis.com/runway-ml/${imageId}.png`, // ← lien public attendu
        model: "gen3a_turbo",
        promptText,
        duration: 5,
        ratio: "1280:720",
        contentModeration: {
          publicFigureThreshold: "auto"
        }
      })
    });

    if (!videoRes.ok) {
      const errorText = await videoRes.text();
      throw new Error("Erreur vidéo Runway : " + errorText);
    }

    const videoData = await videoRes.json();
    const videoJobId = videoData.id;
    logger.info("🎬 Vidéo générée – Job ID :", videoJobId);

    // 💾 4. Mise à jour Firestore
    await scriptRef.update({
      status: "generating",
      imageRunwayId: imageId,
      runwayJobId: videoJobId,
      generationStartedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      imageId,
      videoJobId
    });

  } catch (err) {
    logger.error("❌ Erreur generateAIVideo:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
