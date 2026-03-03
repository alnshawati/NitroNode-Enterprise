const { Queue, Worker, QueueEvents } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

const queues = {};

const initQueue = (name, workerHandler) => {
  const connection = getRedisClient();

  const queue = new Queue(name, { connection });
  queues[name] = queue;

  if (workerHandler) {
    const worker = new Worker(name, async (job) => {
      logger.info({ message: `Processing job ${job.id} in ${name}`, data: job.data });
      await workerHandler(job);
    }, { connection });

    worker.on('failed', (job, err) => {
      logger.error({ message: `Job ${job.id} failed in ${name}`, error: err.message });
    });

    worker.on('completed', (job) => {
      logger.info({ message: `Job ${job.id} completed in ${name}` });
    });
  }

  const events = new QueueEvents(name, { connection });
  return { queue, events };
};

const addJob = async (queueName, jobName, data, options = {}) => {
  if (!queues[queueName]) {
    throw new Error(`Queue ${queueName} not initialized`);
  }
  return queues[queueName].add(jobName, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
};

module.exports = { initQueue, addJob };
