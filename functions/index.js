const { sendEmailOnReady } = require("./sendEmailOnReady");
const { checkScheduledEmails } = require("./checkScheduledEmails");
const { handleNewLeadWorkflow } = require("./handleNewLeadWorkflow");
const { modifyEmail } = require("./modifyEmail");
const { submitMainWebhook } = require("./submitMainWebhook");
const { createMailerSendDomain } = require("./createMailerSendDomain");
const { checkMailerSendDomainStatus } = require("./checkMailerSendDomainStatus");
const { createCustomDomainNetlify } = require("./createCustomDomainNetlify");
const { modifyScript } = require("./modifyScript");
const { generateAIVideo } = require("./generateAIVideo");



exports.sendEmailOnReady = sendEmailOnReady;
exports.checkScheduledEmails = checkScheduledEmails;
exports.handleNewLeadWorkflow = handleNewLeadWorkflow;
exports.modifyEmail = modifyEmail;
exports.submitMainWebhook = submitMainWebhook;
exports.createMailerSendDomain = createMailerSendDomain;
exports.checkMailerSendDomainStatus = checkMailerSendDomainStatus;
exports.createCustomDomainNetlify = createCustomDomainNetlify;
exports.modifyScript = modifyScript;
exports.generateAIVideo = generateAIVideo;
