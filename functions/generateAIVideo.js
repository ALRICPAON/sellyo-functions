const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init"); // ✅ Initialisation centralisée
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
    if (!userId || !scriptId) throw new Error("❌ Paramètres manquants : userId ou scriptId");

    // 🔥 Récupération du script Firestore
    const scriptRef = db.doc(`scripts/${userId}/items/${scriptId}`);
    const scriptSnap = await scriptRef.get();
    if (!scriptSnap.exists) throw new Error("❌ Script introuvable en base");

    const scriptData = scriptSnap.data();
    const promptUrl = scriptData.promptVideoUrl;
    if (!promptUrl) throw new Error("❌ Aucun promptVideoUrl défini dans le script");

    // 📥 Récupération du contenu du prompt
    const promptText = await fetch(promptUrl).then(r => r.text());
    logger.info("📜 Prompt utilisé pour Runway :", promptText);

    // 📦 Construction du payload
    const payload = {
      model: "act_two",           // ✅ Modèle vidéo valide Runway
      promptText: promptText,     // ✅ Texte brut sans emoji
      ratio: "720:1280",          // ✅ Format vertical
      duration: 5                 // ⏱️ Durée courte pour test (en secondes)
    };

    logger.info("📦 Payload envoyé à Runway :", payload);

    // 🚀 Envoi à l'API Runway
    const runwayRes = await fetch("https://api.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06" // ✅ Version obligatoire
      },
      body: JSON.stringify(payload)
    });

    const result = await runwayRes.json();

    if (!runwayRes.ok) {
      logger.error("❌ Erreur Runway : ", result);
      throw new Error("Erreur Runway : " + JSON.stringify(result));
    }

    logger.info("✅ Réponse Runway reçue :", result);

    // 📝 Mise à jour Firestore
    await scriptRef.update({
      status: "generating",
      runwayJobId: result.id || result.job_id || "unknown", // selon réponse
      generationStartedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      jobId: result.id || result.job_id
    });

  } catch (err) {
    logger.error("❌ Erreur generateAIVideo:", err.message);
    res.status(500).json({ error: err.message });
  }
});
