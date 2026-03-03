const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');
const { requestContext, errorHandler, notFoundHandler } = require('./middlewares');
const { corsOptions, logger, getRedisClient } = require('./config');
const swaggerSpec = require('./config/swagger');
const { LIMITS, HTTP_STATUS } = require('./common/constants');
const routes = require('./routes/v1');

const app = express();

app.use(requestContext);

app.use(helmet());
app.disable('x-powered-by');

app.use(express.json({ limit: LIMITS.BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: LIMITS.BODY_SIZE }));

app.use(xss());
app.use(mongoSanitize());

app.use(cors(corsOptions));
app.use(hpp());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', async (req, res) => {
  const redis = getRedisClient();
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
  let redisStatus = 'DOWN';
  try {
    await redis.ping();
    redisStatus = 'UP';
  } catch (err) { }

  res.status(HTTP_STATUS.OK).json({
    status: dbStatus === 'UP' && redisStatus === 'UP' ? 'UP' : 'DEGRADED',
    timestamp: new Date(),
    services: {
      database: dbStatus,
      cache: redisStatus,
    }
  });
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
