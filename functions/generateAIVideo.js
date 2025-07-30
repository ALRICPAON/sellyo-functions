const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init"); // ✅ comme ta fonction qui marche
const db = admin.firestore(); // ✅

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

    // 🔥 Récupération du script
    const scriptRef = db.doc(`scripts/${userId}/items/${scriptId}`);
    const scriptSnap = await scriptRef.get();
    if (!scriptSnap.exists) throw new Error("Script introuvable");

    const scriptData = scriptSnap.data();
    const promptUrl = scriptData.promptVideoUrl;
    if (!promptUrl) throw new Error("Aucun promptVideoUrl défini");

    // 📥 Récupération du contenu texte
    const promptText = await fetch(promptUrl).then(r => r.text());
    logger.info("🎞️ Prompt Runway utilisé :", promptText);

    // 📤 Appel Runway
    const runwayRes = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptText,
        model: "gen-2",
        width: 720,
        height: 1280,
        num_frames: 24,
        output_format: "mp4"
      })
    });

    if (!runwayRes.ok) throw new Error("Erreur Runway : " + runwayRes.statusText);
    const runwayData = await runwayRes.json();
    logger.info("✅ Réponse Runway :", runwayData);

    // ✅ Mise à jour du document script
    await scriptRef.update({
      status: "generating",
      runwayJobId: runwayData.id,
      generationStartedAt: new Date().toISOString()
    });

    res.status(200).json({ success: true, jobId: runwayData.id });

  } catch (err) {
    logger.error("❌ Erreur generateAIVideo:", err.message);
    res.status(500).json({ error: err.message });
  }
});
