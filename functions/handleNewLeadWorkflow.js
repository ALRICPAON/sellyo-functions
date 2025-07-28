const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("./firebase-admin-init");

const db = admin.firestore();

exports.handleNewLeadWorkflow = onDocumentCreated(
  {
    document: "leads/{leadId}",
    region: "us-central1",
    memory: "256MiB",
    cpu: 1,
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    const lead = snap.data;
    console.log("🚀 Nouveau lead détecté :", lead);

    const refId = lead.refId || lead.source?.refId;

    if (!lead || !refId || !lead.email || !lead.userId) {
      console.log("❌ Lead incomplet ou invalide. Abandon.");
      return;
    }

    const workflowsSnap = await db.collection("workflows")
      .where("userId", "==", lead.userId)
      .get();

    if (workflowsSnap.empty) {
      console.log("❌ Aucun workflow trouvé pour cet utilisateur.");
      return;
    }

    let matchedWorkflow = null;

    workflowsSnap.forEach(doc => {
      const wf = doc.data();
      if (wf.landingId === refId || wf.tunnelId === refId) {
        matchedWorkflow = { id: doc.id, ...wf };
      }
    });

    if (!matchedWorkflow) {
      console.log(`❌ Aucun workflow ne correspond à refId=${refId}`);
      return;
    }

    console.log("✅ Workflow correspondant trouvé :", matchedWorkflow.name || matchedWorkflow.id);

    for (const item of matchedWorkflow.emails || []) {
      const originalEmailDoc = await db.collection("emails").doc(item.emailId).get();
      if (!originalEmailDoc.exists) {
        console.log(`⚠️ Email source introuvable : ${item.emailId}`);
        continue;
      }

      const emailData = originalEmailDoc.data();
      const scheduledDate = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + item.delay * 86400000)
      );

     await db.collection("emails").add({
  ...emailData,
  toEmail: lead.email,
  userId: lead.userId,
  status: "scheduled",
  createdAt: admin.firestore.Timestamp.now(),
  scheduledAt: scheduledDate,
  originLeadId: snap.id,
  associatedId: refId, // ✅ nécessaire pour sendEmailOnReady
  refId: refId,
  manualRecipients: [lead.email], // ✅ fallback utile
  workflowId: matchedWorkflow.id,
  source: {
    type: "workflow",
    refId: refId
  }
});

      console.log(`📩 Email ${item.emailId} dupliqué pour ${lead.email}`);
    }
  }
);
