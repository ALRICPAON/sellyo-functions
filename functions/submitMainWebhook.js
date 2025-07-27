const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch"); // si besoin en local

exports.submitMainWebhook = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("Secret MAKE_WEBHOOK_URL non défini");
    }

    const {
      userId,
      type,
      name,
      goal,
      desc,
      cta,
      mainColor,
      backgroundColor,
      price,
      paymentLink,
      logo,
      cover,
      video,
      subject,
      replyTo,
      tone,
      productLink,
      productPrice,
      landingId,
      tunnelId
    } = req.body;

    const payload = {
      userId,
      type,
      name,
      goal,
      desc,
      cta,
      mainColor,
      backgroundColor,
      price,
      paymentLink,
      logo,
      cover,
      video,
      subject,
      replyTo,
      tone,
      productLink,
      productPrice,
      landingId,
      tunnelId
    };

    // Nettoyage des champs vides pour éviter les bugs côté Make
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    logger.info("📤 Envoi webhook Make", payload);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erreur webhook: ${response.status}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("❌ Erreur fonction submitMainWebhook", err);
    res.status(500).json({ error: err.message });
  }
});
