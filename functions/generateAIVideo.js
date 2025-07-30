const { onCall } = require("firebase-functions/v2/https");
const admin = require("./firebase-admin-init");
const fetch = require("node-fetch");

const db = admin.firestore();

exports.generateAIVideo = onCall(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
    secrets: ["RUNWAY_API_KEY"],
  },
  async (req) => {
    const { userId, scriptId } = req.data;

    if (!userId || !scriptId) {
      throw new Error("Paramètres manquants (userId, scriptId)");
    }

    const docRef = db.collection("scripts").doc(userId).collection("items").doc(scriptId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("Document script introuvable");
    }

    const data = docSnap.data();

    if (!data.generatedImageUrl) {
      throw new Error("Image non générée. Champ generatedImageUrl manquant");
    }

    const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        input: {
          image: data.generatedImageUrl,
        },
        model: "gen-3-turbo",
        duration: 5,
        contentModeration: {
          publicFigureThreshold: "auto"
        }
      }),
    });

    const json = await response.json();

    if (!json?.id) {
      console.error("❌ Erreur Runway : ", json);
      throw new Error("Échec de la génération de la vidéo Runway");
    }

    const runwayJobId = json.id;

    await docRef.update({
      videoJobId: runwayJobId,
      videoStatus: "generating",
      generationStartedAt: new Date().toISOString()
    });

    console.log("🎥 Vidéo Runway lancée avec jobId :", runwayJobId);

    return {
      success: true,
      runwayJobId
    };
  }
);
