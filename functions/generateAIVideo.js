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

    // 🔥 1. Récupération du prompt depuis Firestore
    const scriptRef = db.doc(`scripts/${userId}/items/${scriptId}`);
    const scriptSnap = await scriptRef.get();
    if (!scriptSnap.exists) throw new Error("Script introuvable.");

    const scriptData = scriptSnap.data();
    const promptUrl = scriptData.promptVideoUrl;
    if (!promptUrl) throw new Error("Aucun promptVideoUrl défini.");

    const promptText = await fetch(promptUrl).then(r => r.text());
    logger.info("📝 Prompt utilisé :", promptText);

    // 🖼️ 2. Génération de l'image (text_to_image)
    const imageRes = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptText,
        mode: "text_to_image",
        width: 768,
        height: 768
      })
    });

    if (!imageRes.ok) {
      const errText = await imageRes.text();
      throw new Error("Erreur image Runway : " + errText);
    }

    const imageData = await imageRes.json();
    const imageId = imageData.id;
    logger.info("🖼️ Image générée avec ID :", imageId);

    // 📽️ 3. Génération de la vidéo (image_to_video)
    const videoRes = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: { image_id: imageId },
        mode: "image_to_video",
        width: 720,
        height: 1280,
        num_frames: 24,
        output_format: "mp4"
      })
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      throw new Error("Erreur vidéo Runway : " + errText);
    }

    const videoData = await videoRes.json();
    logger.info("🎬 Vidéo en cours de génération. ID :", videoData.id);

    // 💾 4. Sauvegarde Firestore
    await scriptRef.update({
      status: "generating",
      imageRunwayId: imageId,
      runwayJobId: videoData.id,
      generationStartedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      imageId,
      videoJobId: videoData.id
    });

  } catch (err) {
    logger.error("❌ Erreur generateAIVideo:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
