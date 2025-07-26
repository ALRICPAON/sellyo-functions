const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("./firebase-admin-init");

const db = admin.firestore();

exports.checkScheduledEmails = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    memory: "256MiB",
    cpu: 1,
    timeoutSeconds: 60,
  },
  async (event) => {
    const now = new Date();

    const snapshot = await db.collection("emails")
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", now)
      .get();

    if (snapshot.empty) {
      console.log("⏱️ Aucun email à programmer pour l'instant.");
      return;
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      console.log(`📤 Passage à READY : ${doc.id}`);
      batch.update(doc.ref, { status: "ready" });
    });

    await batch.commit();
    console.log(`✅ ${snapshot.size} email(s) mis à jour.`);
  }
);
