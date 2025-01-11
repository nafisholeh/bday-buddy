import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { MessageQueue } from './messageQueue';
import * as schedule from 'node-schedule';

export class BirthdayService {
  private prisma: PrismaClient;
  private messageQueue: MessageQueue;

  constructor(prisma: PrismaClient, messageQueue: MessageQueue) {
    this.prisma = prisma;
    this.messageQueue = messageQueue;
    this.startScheduler();
  }

  private startScheduler(): void {
    // Check every minute for birthdays
    schedule.scheduleJob('* * * * *', async () => {
      await this.processBirthdays();
    });

    // Process failed messages every 5 minutes
    schedule.scheduleJob('*/5 * * * *', async () => {
      await this.messageQueue.processFailedMessages();
    });
  }

  private async processBirthdays(): Promise<void> {
    const users = await this.findUsersWithBirthdayNow();
    for (const user of users) {
      await this.messageQueue.enqueueMessage(user);
    }
  }

  private async findUsersWithBirthdayNow(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.filter((user) => {
      const userDateTime = DateTime.now().setZone(user.timezone);
      const birthday = DateTime.fromJSDate(user.birthday).setZone(
        user.timezone
      );

      return (
        userDateTime.hour === 9 &&
        userDateTime.month === birthday.month &&
        userDateTime.day === birthday.day &&
        (!user.lastBirthdayMessageSent ||
          DateTime.fromJSDate(user.lastBirthdayMessageSent).year <
            userDateTime.year)
      );
    });
  }
}
