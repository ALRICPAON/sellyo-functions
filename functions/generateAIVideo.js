const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init"); // ✅ Centralisé
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
    logger.info("📩 Données reçues :", { userId, scriptId });

    if (!userId || !scriptId) throw new Error("Paramètres manquants.");

    // 🔥 Récupération du script depuis Firestore
    const scriptRef = db.doc(`scripts/${userId}/items/${scriptId}`);
    const scriptSnap = await scriptRef.get();
    if (!scriptSnap.exists) throw new Error("Script introuvable");

    const scriptData = scriptSnap.data();
    const promptUrl = scriptData.promptVideoUrl;
    logger.info("🌐 URL du prompt :", promptUrl);

    if (!promptUrl) throw new Error("Aucun promptVideoUrl défini");

    // 📥 Récupération du texte brut
    const promptText = await fetch(promptUrl).then(r => r.text());
    logger.info("🧠 Prompt utilisé pour Runway :", promptText);

    // 📤 Appel Runway
    const payload = {
      prompt: promptText,
      model: "act-two", // 🔄 assure-toi que ce modèle est bien dispo dans ton compte
      width: 720,
      height: 1280,
      num_frames: 24,
      output_format: "mp4"
    };

    logger.info("📤 Payload Runway envoyé :", payload);

    const runwayRes = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultText = await runwayRes.text(); // 🔍 Affiche l'erreur lisible si échec
    logger.info("📨 Réponse brute Runway :", resultText);

    if (!runwayRes.ok) {
      throw new Error("Erreur Runway : " + resultText);
    }

    const runwayData = JSON.parse(resultText);
    logger.info("✅ Réponse JSON Runway :", runwayData);

    // 📝 Enregistrement
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
