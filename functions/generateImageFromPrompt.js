const { onCall } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");
const { getStorage } = require("firebase-admin/storage");
const fetch = require("node-fetch");

const db = admin.firestore();
const storage = getStorage();

exports.generateImageFromPrompt = onCall(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
    secrets: ["RUNWAY_API_KEY"],
  },
  async (req) => {
    const { userId, scriptId } = req.data;

    if (!userId || !scriptId) {
      throw new Error("Paramètres manquants");
    }

    const docRef = db.collection("scripts").doc(userId).collection("items").doc(scriptId);
    const docSnap = await docRef.get();
    const data = docSnap.data();

    if (!data || !data.promptVideoUrl) {
      throw new Error("Champ promptVideoUrl manquant");
    }

    // 1. Lire le fichier texte depuis Storage
    const fileRef = storage.bucket().file(data.promptVideoUrl.replace(/^https:\/\/.*\.appspot\.com\//, ""));
    const [contentBuffer] = await fileRef.download();
    const promptText = contentBuffer.toString("utf8");

    // 2. Appel à l'API Runway pour générer l'image
    const response = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        promptText,
        model: "gen4_image",
        ratio: "1280:720",
        contentModeration: {
          publicFigureThreshold: "auto"
        }
      })
    });

    const json = await response.json();
    if (!json?.id) throw new Error("Erreur Runway : aucune ID de génération");

    const runwayJobId = json.id;

    // 3. Enregistrer l’ID dans Firestore (image en attente de récupération ou lien direct s’il est dispo)
    await docRef.update({
      imageJobId: runwayJobId,
      imageStatus: "generating",
      generationStartedAt: new Date().toISOString()
    });

    return { success: true, runwayJobId };
  }
);
