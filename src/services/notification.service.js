const { initQueue, addJob } = require('./queue.service');
const emailService = require('./email.service');
const logger = require('../config/logger');

const NOTIFICATION_QUEUE = 'notifications';

const processNotification = async (job) => {
  const { userId, type, data, channels } = job.data;

  if (channels.includes('email')) {
    await emailService.sendEmail({
      to: data.email,
      templateName: type,
      templateData: data,
    });
  }

  if (channels.includes('slack')) {
    logger.info({ message: 'Slack notification processing', userId, type });
  }
};

initQueue(NOTIFICATION_QUEUE, processNotification);

const sendNotification = async ({ userId, type, data, channels = ['email'] }) => {
  try {
    await addJob(NOTIFICATION_QUEUE, 'send_alert', { userId, type, data, channels });
  } catch (err) {
    logger.error({ message: 'Notification queueing failed', userId, type, error: err.message });
  }
};

module.exports = {
  sendNotification,
};
