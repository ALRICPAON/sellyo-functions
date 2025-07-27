const { sendEmailOnReady } = require("./sendEmailOnReady");
const { checkScheduledEmails } = require("./checkScheduledEmails");
const { handleNewLeadWorkflow } = require("./handleNewLeadWorkflow");
const { modifyEmail } = require("./modifyEmail");
const { submitMainWebhook } = require("./submitMainWebhook");


exports.submitMainWebhook = submitMainWebhook;
exports.sendEmailOnReady = sendEmailOnReady;
exports.checkScheduledEmails = checkScheduledEmails;
exports.handleNewLeadWorkflow = handleNewLeadWorkflow;
exports.modifyEmail = require("./modifyEmail").modifyEmail;

