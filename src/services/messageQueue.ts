import { PrismaClient } from '@prisma/client';
import { EmailService } from './emailService';
import { User } from '../types';

export class MessageQueue {
  private static instance: MessageQueue;
  private isProcessing: boolean = false;
  private prisma: PrismaClient;
  private emailService: EmailService;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [5 * 60, 30 * 60, 2 * 60 * 60]; // 5min, 30min, 2hours

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
    console.log(
      `Attempting to send birthday message to ${user.firstName} ${user.lastName}`
    );

    const success = await this.emailService.sendBirthdayEmail(user);
    if (success) {
      await this.updateLastSentDate(user.id);
      console.log(
        `Successfully sent birthday message to ${user.firstName} ${user.lastName}`
      );
    } else {
      await this.handleFailedMessage(user.id);
      console.log(
        `Failed to send birthday message to ${user.firstName} ${user.lastName}, queued for retry`
      );
    }
  }

  async processFailedMessages(): Promise<void> {
    if (this.isProcessing) {
      console.log('Already processing failed messages, skipping this run');
      return;
    }

    this.isProcessing = true;
    console.log('Starting to process failed messages');

    try {
      const failedMessages = await this.prisma.failedMessage.findMany({
        where: {
          nextRetry: { lte: new Date() }
        },
        take: 100,
        orderBy: {
          nextRetry: 'asc'
        }
      });

      console.log(`Found ${failedMessages.length} failed messages to retry`);

      for (const message of failedMessages) {
        const user = (await this.prisma.user.findUnique({
          where: { id: message.userId }
        })) as User;

        if (!user) {
          console.log(
            `User ${message.userId} not found, removing failed message`
          );
          await this.prisma.failedMessage.delete({ where: { id: message.id } });
          continue;
        }

        console.log(
          `Retrying message for user ${user.firstName} ${user.lastName} (attempt ${message.attempt})`
        );
        const success = await this.emailService.sendBirthdayEmail(user);

        if (success) {
          await this.prisma.$transaction([
            this.prisma.failedMessage.delete({ where: { id: message.id } }),
            this.prisma.user.update({
              where: { id: user.id },
              data: { lastBirthdayMessageSent: new Date() }
            })
          ]);
          console.log(
            `Retry successful for user ${user.firstName} ${user.lastName}`
          );
        } else if (message.attempt < this.MAX_RETRIES) {
          const nextRetry = new Date(
            Date.now() + this.RETRY_DELAYS[message.attempt] * 1000
          );
          await this.prisma.failedMessage.update({
            where: { id: message.id },
            data: {
              attempt: message.attempt + 1,
              nextRetry
            }
          });
          console.log(
            `Retry failed for user ${user.firstName} ${user.lastName}, scheduled next retry at ${nextRetry}`
          );
        } else {
          console.log(
            `Max retries reached for user ${user.firstName} ${user.lastName}, removing failed message`
          );
          await this.prisma.failedMessage.delete({ where: { id: message.id } });
        }
      }
    } catch (error) {
      console.error('Error processing failed messages:', error);
    } finally {
      this.isProcessing = false;
      console.log('Finished processing failed messages');
    }
  }

  private async handleFailedMessage(userId: string): Promise<void> {
    const nextRetry = new Date(Date.now() + this.RETRY_DELAYS[0] * 1000);
    await this.prisma.failedMessage.create({
      data: {
        userId,
        attempt: 1,
        nextRetry
      }
    });
  }

  private async updateLastSentDate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastBirthdayMessageSent: new Date() }
    });
  }
}
