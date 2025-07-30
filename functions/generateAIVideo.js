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

    // 🖼️ 2. Génération image : text_to_image
    const imageGenRes = await fetch("https://api.runwayml.com/v1/text_to_image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        prompt: promptText,
        model: "gen3a_turbo",
        ratio: "9:16"
      })
    });

    if (!imageGenRes.ok) {
      const errText = await imageGenRes.text();
      throw new Error("Erreur génération image : " + errText);
    }

    const imageGenData = await imageGenRes.json();
    const imageTaskId = imageGenData.id;
    logger.info("🕒 Attente génération image - Task ID :", imageTaskId);

    // ⏳ 3. Polling pour récupérer image_url
    let imageUrl = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 3000)); // ⏱️ 3 secondes
      const statusRes = await fetch(`https://api.runwayml.com/v1/tasks/${imageTaskId}`, {
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06"
        }
      });
      const statusData = await statusRes.json();
      if (statusData.status === "succeeded" && statusData.outputs?.[0]?.image_url) {
        imageUrl = statusData.outputs[0].image_url;
        logger.info("🖼️ Image générée :", imageUrl);
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("Image non générée dans le temps imparti.");
    }

    // 🎬 4. Génération vidéo à partir de l’image
    const videoRes = await fetch("https://api.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        promptImage: imageUrl,
        model: "gen3a_turbo",
        promptText,
        duration: 5,
        ratio: "9:16"
      })
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      throw new Error("Erreur vidéo Runway : " + errText);
    }

    const videoData = await videoRes.json();
    const videoTaskId = videoData.id;
    logger.info("🎥 Vidéo en cours de génération - Job ID :", videoTaskId);

    // 💾 5. Sauvegarde Firestore
    await scriptRef.update({
      status: "generating",
      runwayJobId: videoTaskId,
      imageRunwayUrl: imageUrl,
      generationStartedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      videoJobId: videoTaskId,
      imageUrl
    });

  } catch (err) {
    logger.error("❌ Erreur generateAIVideo:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
