import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { initializeRoutes } from './routes';
import { BirthdayService } from './services/birthdayService';
import { MessageQueue } from './services/messageQueue';
import { EmailService } from './services/emailService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Initialize services
const emailService = new EmailService();
const messageQueue = MessageQueue.getInstance(prisma, emailService);
const birthdayService = new BirthdayService(prisma, messageQueue);

// Express middleware
app.use(express.json());
app.use('/api', initializeRoutes(birthdayService));

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  }
);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Birthday service initialized and scheduler started');
});

export { app, server };
