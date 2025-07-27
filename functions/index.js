const { sendEmailOnReady } = require("./sendEmailOnReady");
const { checkScheduledEmails } = require("./checkScheduledEmails");
const { handleNewLeadWorkflow } = require("./handleNewLeadWorkflow");
const { modifyEmail } = require("./modifyEmail");
const { submitMainWebhook } = require("./submitMainWebhook");
const { createMailerSendDomain } = require("./createMailerSendDomain");

exports.submitMainWebhook = submitMainWebhook;
exports.sendEmailOnReady = sendEmailOnReady;
exports.checkScheduledEmails = checkScheduledEmails;
exports.handleNewLeadWorkflow = handleNewLeadWorkflow;
exports.modifyEmail = modifyEmail; // 👈 pas besoin de require à nouveau ici
exports.createMailerSendDomain = createMailerSendDomain;
