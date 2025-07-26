const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");
const MailerSend = require("mailersend").MailerSend;
const EmailParams = require("mailersend").EmailParams;
const Sender = require("mailersend").Sender;
const Recipient = require("mailersend").Recipient;
const { modifyEmail } = require("./modifyEmail");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const mailsend = new MailerSend({
  apiKey: functions.config().mailersend.api_key,
});

exports.sendEmailOnReady = onDocumentUpdated("emails/{emailId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.status === "ready" || after.status !== "ready") return;

  const {
    subject,
    url: githubUrl,
    userId,
    associatedId,
    recipients: manualRecipients = [],
    attachments = []
  } = after;
  const replyToEmail = after.replyTo || "support@sellyo.fr";

  let htmlContent = "";
  let urlReady = false;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(githubUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (res.status === 200 && res.data.includes("<h1")) {
        htmlContent = res.data;
        urlReady = true;
        break;
      }
    } catch (err) {
      console.warn(`⏳ Tentative ${i + 1} – HTML non dispo (${err.message})`);
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (!urlReady) return;

  let recipients = [];

  if (manualRecipients.length > 0) {
    recipients = manualRecipients.map(email => ({ email, name: "Client" }));
  } else if (associatedId) {
    const leadsRef = db.collection(`tunnels/${associatedId}/leads`);
    const leadsSnapshot = await leadsRef.get();
    recipients = leadsSnapshot.docs.map(doc => {
      const lead = doc.data();
      return { email: lead.email, name: lead.name || "Client" };
    });
    if (recipients.length === 0) return;
  } else {
    return;
  }

  const from = new Sender("noreply@mail.sellyo.fr", "Sellyo");

  for (const recipient of recipients) {
    const to = [new Recipient(recipient.email, recipient.name)];

    const emailParams = new EmailParams()
      .setFrom(from)
      .setTo(to)
      .setSubject(subject)
      .setHtml(htmlContent)
      .setReplyTo([{ email: replyToEmail, name: "Réponse client" }]);

    console.log("📬 Reply-To utilisé :", replyToEmail);

    const attachmentsList = [];

    for (const file of attachments) {
      try {
        const res = await axios.get(file.url, { responseType: 'arraybuffer' });
        const encoded = Buffer.from(res.data).toString('base64');
        attachmentsList.push({
          content: encoded,
          filename: file.name,
          disposition: 'attachment',
          type: file.type || 'application/octet-stream'
        });
      } catch (err) {
        console.warn(`❌ Erreur chargement pièce jointe ${file.name} : ${err.message}`);
      }
    }

    if (attachmentsList.length > 0) {
      emailParams.setAttachments(attachmentsList);
    }

    try {
      await mailsend.email.send(emailParams);
      console.log("✅ Email envoyé à :", recipient.email);
    } catch (err) {
      console.error("❌ Erreur envoi MailerSend :", err);
    }
  }

  try {
    const emailDocRef = db.doc(`emails/${event.params.emailId}`);
    await emailDocRef.update({ status: "sent" });
  } catch (updateError) {
    console.error("❌ Impossible de mettre à jour le statut :", updateError.message);
  }
});

exports.checkScheduledEmails = onSchedule("every 1 minutes", async () => {
  const now = new Date();
  const snapshot = await db.collection("emails")
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", now)
    .get();

  if (snapshot.empty) {
    console.log("⏱️ Aucun email à programmer pour l'instant.");
    return null;
  }

  const batch = db.batch();
  snapshot.forEach((doc) => {
    console.log(`📤 Passage à READY : ${doc.id}`);
    batch.update(doc.ref, { status: "ready" });
  });

  await batch.commit();
  console.log(`✅ ${snapshot.size} email(s) mis à jour.`);
});

exports.handleNewLeadWorkflow = onDocumentCreated("leads/{leadId}", async (event) => {
  const lead = event.data.data();
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
      originLeadId: event.params.leadId,
      refId: refId,
      workflowId: matchedWorkflow.id,
      source: {
        type: "workflow",
        refId: refId
      }
    });

    console.log(`📩 Email ${item.emailId} dupliqué pour ${lead.email}`);
  }
});
module.exports = {
  sendEmailOnReady,
  checkScheduledEmails,
  handleNewLeadWorkflow,
  modifyEmail // 👈 ajoute cette ligne ici
};

