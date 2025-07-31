const functions = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
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
      logger.info("⏱️ Début de la vérification des images IA en attente...");

      const snapshot = await db
        .collectionGroup("items")
        .where("imageStatus", "==", "generating")
        .get();

      if (snapshot.empty) {
        logger.info("✅ Aucun job d'image en attente.");
        return;
      }

      logger.info(`📦 ${snapshot.size} documents à vérifier.`);

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const docRef = doc.ref;

        logger.info(`📝 Doc ID : ${doc.id}`);
        logger.info(`📁 Chemin Firestore : ${docRef.path}`);

        if (!data.runwayJobId) {
          logger.warn(`⚠️ Pas de runwayJobId pour ${doc.id}, skip.`);
          continue;
        }

        logger.info(`🛠️ Job ID Runway : ${data.runwayJobId}`);

        try {
          const res = await fetch(`https://api.dev.runwayml.com/v1/jobs/${data.runwayJobId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
              "X-Runway-Version": "2024-11-06",
            }
          });

          const jobData = await res.json();
          logger.info(`📬 jobData.status : ${jobData.status}`);
          logger.info(`📬 jobData complet : ${JSON.stringify(jobData)}`);

          if (jobData.status === "succeeded" && jobData.output?.[0]?.url) {
            logger.info(`✅ Image générée avec succès : ${jobData.output[0].url}`);

            try {
              await docRef.update({
                imageStatus: "ready",
                generatedImageUrl: jobData.output[0].url,
                imageCompletedAt: new Date().toISOString()
              });
              logger.info(`📥 Mise à jour Firestore réussie pour ${doc.id}`);
            } catch (updateErr) {
              logger.error(`❌ Erreur Firestore UPDATE (ready) pour ${doc.id} : ${updateErr.message}`);
              logger.error(`🔍 Stack : ${updateErr.stack}`);
            }

          } else if (jobData.status === "failed") {
            logger.warn(`⛔ Job Runway échoué pour ${doc.id}`);

            try {
              await docRef.update({ imageStatus: "failed" });
              logger.info(`📥 Statut mis à "failed" pour ${doc.id}`);
            } catch (updateErr) {
              logger.error(`❌ Erreur Firestore UPDATE (failed) pour ${doc.id} : ${updateErr.message}`);
              logger.error(`🔍 Stack : ${updateErr.stack}`);
            }

          } else {
            logger.info(`⏳ Job ${doc.id} toujours en cours (statut: ${jobData.status})`);
          }

        } catch (apiErr) {
          logger.error(`💥 Erreur lors de l'appel API Runway pour ${doc.id} : ${apiErr.message}`);
          logger.error(`🔍 Stack : ${apiErr.stack}`);
        }
      }

    } catch (outerErr) {
      logger.error(`🔥 Erreur globale dans checkImageStatus : ${outerErr.message}`);
      logger.error(`🔍 Stack : ${outerErr.stack}`);
    }
  }
);
