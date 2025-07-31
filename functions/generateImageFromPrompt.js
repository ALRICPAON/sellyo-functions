const { onCall } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");

const db = admin.firestore();

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

    if (!docSnap.exists) {
      throw new Error("Script introuvable");
    }

    const data = docSnap.data();

    if (!data.promptVideoUrl) {
      throw new Error("Champ promptVideoUrl manquant");
    }

    // ✅ Étape 1 : Télécharger le texte du prompt
    const responseTxt = await fetch(data.promptVideoUrl);
    if (!responseTxt.ok) {
      throw new Error("Échec de téléchargement du fichier prompt");
    }

    const textPrompt = await responseTxt.text();
    console.log("🧠 Prompt texte téléchargé :", textPrompt);

    if (!textPrompt || textPrompt.length < 5) {
      throw new Error("Contenu du prompt texte vide ou invalide");
    }

    // ✅ Étape 2 : Appel à Runway pour générer l'image
    const response = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        promptText: textPrompt,
        model: "gen4_image",
        ratio: "1280:720",
        seed: 1234567890,
        contentModeration: {
          publicFigureThreshold: "auto"
        }
      }),
    });

    const json = await response.json();

    if (!json?.id) {
      console.error("❌ Erreur API Runway :", json);
      throw new Error("Échec génération image IA (pas de job ID)");
    }

    // 🕐 Mise à jour Firestore avec le Job ID
    await docRef.update({
      imageStatus: "generating",
      runwayJobId: json.id,
      imageRequestedAt: new Date().toISOString()
    });

    return {
      success: true,
      runwayJobId: json.id,
      message: "Image en cours de génération"
    };
  }
);
