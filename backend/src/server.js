const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/database');

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL successfully.');

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 PeoplePay360 Backend Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
      logger.info(`👉 API Health: http://localhost:${env.PORT}/api/health`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Closed database connection and HTTP server.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
