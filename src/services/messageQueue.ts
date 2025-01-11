import { PrismaClient } from '@prisma/client';
import { EmailService } from './emailService';
import { User } from '../types';

export class MessageQueue {
  private static instance: MessageQueue;
  private isProcessing: boolean = false;
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor(prisma: PrismaClient, emailService: EmailService) {
    this.prisma = prisma;
    this.emailService = emailService;
  }

  static getInstance(
    prisma: PrismaClient,
    emailService: EmailService
  ): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue(prisma, emailService);
    }
    return MessageQueue.instance;
  }

  async enqueueMessage(user: User): Promise<void> {
    const success = await this.emailService.sendBirthdayEmail(user);
    if (!success) {
      await this.handleFailedMessage(user.id);
    } else {
      await this.updateLastSentDate(user.id);
    }
  }

  private async handleFailedMessage(userId: string): Promise<void> {
    await this.prisma.failedMessage.create({
      data: {
        userId,
        attempt: 1,
        nextRetry: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });
  }

  async processFailedMessages(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const failedMessages = await this.prisma.failedMessage.findMany({
        where: { nextRetry: { lte: new Date() } },
        take: 100
      });

      for (const message of failedMessages) {
        const user = await this.prisma.user.findUnique({
          where: { id: message.userId }
        });

        if (!user) continue;

        const success = await this.emailService.sendBirthdayEmail(user);
        if (success) {
          await this.prisma.$transaction([
            this.prisma.failedMessage.delete({ where: { id: message.id } }),
            this.updateLastSentDate(user.id)
          ]);
        } else if (message.attempt < 3) {
          await this.prisma.failedMessage.update({
            where: { id: message.id },
            data: {
              attempt: message.attempt + 1,
              nextRetry: new Date(
                Date.now() + Math.pow(2, message.attempt) * 5 * 60 * 1000
              )
            }
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async updateLastSentDate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastBirthdayMessageSent: new Date() }
    });
  }
}
