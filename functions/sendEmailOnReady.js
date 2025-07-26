const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions/v2");
const admin = require("./firebase-admin-init");
const axios = require("axios");
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const db = admin.firestore();
const mailsend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

exports.sendEmailOnReady = onDocumentUpdated(
  {
    document: "emails/{emailId}",
    region: "us-central1",
    memory: "512MiB",
    cpu: 1,
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data.before.data;
    const after = event.data.after.data;

    if (before.status === "ready" || after.status !== "ready") return;

    const {
      subject,
      url: githubUrl,
      userId,
      associatedId,
      recipients: manualRecipients = [],
      attachments = [],
      replyTo = "support@sellyo.fr",
    } = after;

    let htmlContent = "";
    let urlReady = false;

    for (let i = 0; i < 3; i++) {
      try {
        const res = await axios.get(githubUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.status === 200 && res.data.includes("<h1")) {
          htmlContent = res.data;
          urlReady = true;
          break;
        }
      } catch (err) {
        console.warn(`⏳ Tentative ${i + 1} – HTML non dispo (${err.message})`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!urlReady) return;

    let recipients = [];

    if (manualRecipients.length > 0) {
      recipients = manualRecipients.map((email) => ({ email, name: "Client" }));
    } else if (associatedId) {
      const leadsRef = db.collection(`tunnels/${associatedId}/leads`);
      const leadsSnapshot = await leadsRef.get();
      recipients = leadsSnapshot.docs.map((doc) => {
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
        .setReplyTo([{ email: replyTo, name: "Réponse client" }]);

      const attachmentsList = [];
      for (const file of attachments) {
        try {
          const res = await axios.get(file.url, { responseType: "arraybuffer" });
          const encoded = Buffer.from(res.data).toString("base64");
          attachmentsList.push({
            content: encoded,
            filename: file.name,
            disposition: "attachment",
            type: file.type || "application/octet-stream",
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
  }
);
