const functions = require("firebase-functions/v2"); // ✅ utile si tu veux utiliser functions.logger
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger"); // ✅ import correct du logger
const fetch = require("node-fetch");
const admin = require("./firebase-admin-init");

const db = admin.firestore();

exports.checkImageStatus = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "1GiB",
    secrets: ["RUNWAY_API_KEY"]
  },
  async () => {
    try {
      logger.info("⏱️ Début vérification des images IA en attente...");

      const snapshot = await db
        .collectionGroup("items")
        .where("imageStatus", "==", "generating")
        .get();

      if (snapshot.empty) {
        logger.info("✅ Aucun job d'image en attente");
        return;
      }

      logger.info(`📦 ${snapshot.size} images à vérifier...`);

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const docRef = doc.ref;

        if (!data.runwayJobId) {
          logger.warn(`⚠️ Pas de runwayJobId pour ${doc.id}, skip.`);
          continue;
        }

        try {
          const res = await fetch(`https://api.dev.runwayml.com/v1/jobs/${data.runwayJobId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
              "X-Runway-Version": "2024-11-06",
            }
          });

          const jobData = await res.json();

         if (jobData.status === "succeeded" && jobData.output?.[0]?.url) {
  logger.info(`➡️ Tentative d'update pour ${doc.id} avec status "ready"`);

  try {
    await docRef.update({
      imageStatus: "ready",
      generatedImageUrl: jobData.output[0].url,
      imageCompletedAt: new Date().toISOString()
    });
    logger.info(`✅ Image prête pour ${doc.id} – URL : ${jobData.output[0].url}`);
  } catch (updateErr) {
    logger.error(`❌ Erreur update Firestore (ready) pour ${doc.id} : ${updateErr.message}`);
  }

} else if (jobData.status === "failed") {
  logger.info(`➡️ Tentative d'update pour ${doc.id} avec status "failed"`);

  try {
    await docRef.update({ imageStatus: "failed" });
    logger.info(`⚠️ Statut mis à "failed" pour ${doc.id}`);
  } catch (updateErr) {
    logger.error(`❌ Erreur update Firestore (failed) pour ${doc.id} : ${updateErr.message}`);
  }

} else {
  logger.info(`⏳ Job ${doc.id} toujours en cours (statut: ${jobData.status})`);
}
        } catch (innerErr) {
          logger.error(`💥 Erreur API Runway pour ${doc.id} : ${innerErr.message}`);
        }
      }

    } catch (outerErr) {
      logger.error(`🔥 Erreur globale dans checkImageStatus : ${outerErr.message}`);
    }
  }
);
