import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { MessageQueue } from './messageQueue';
import * as schedule from 'node-schedule';
import { User } from '../types';

export class BirthdayService {
  private prisma: PrismaClient;
  private messageQueue: MessageQueue;
  private jobs: schedule.Job[] = [];

  constructor(prisma: PrismaClient, messageQueue: MessageQueue) {
    this.prisma = prisma;
    this.messageQueue = messageQueue;
    this.startScheduler();
    console.log('BirthdayService initialized');
  }

  private startScheduler(): void {
    // Check every minute for birthdays
    const birthdayJob = schedule.scheduleJob('* * * * *', async () => {
      console.log('Running birthday check at:', new Date().toISOString());
      await this.processBirthdays();
    });

    // Process failed messages every 5 minutes
    const failedMessageJob = schedule.scheduleJob('*/5 * * * *', async () => {
      console.log('Processing failed messages at:', new Date().toISOString());
      await this.messageQueue.processFailedMessages();
    });

    this.jobs.push(birthdayJob, failedMessageJob);
    console.log(
      'Scheduler started with jobs:',
      this.jobs.map((job) => job.name || 'Unnamed job').join(', ')
    );
  }

  private async processBirthdays(): Promise<void> {
    const users = await this.findUsersWithBirthdayNow();
    console.log(`Found ${users.length} users with birthdays now`);

    for (const user of users) {
      console.log(
        `Processing birthday for user: ${user.firstName} ${user.lastName}`
      );
      await this.messageQueue.enqueueMessage(user);
    }
  }

  private async findUsersWithBirthdayNow(): Promise<User[]> {
    const users = (await this.prisma.user.findMany()) as User[];
    return users.filter((user: User) => {
      const userDateTime = DateTime.now().setZone(user.timezone);
      const birthday = DateTime.fromJSDate(user.birthday).setZone(
        user.timezone
      );

      const isBirthday =
        userDateTime.hour === 9 &&
        userDateTime.month === birthday.month &&
        userDateTime.day === birthday.day &&
        (!user.lastBirthdayMessageSent ||
          DateTime.fromJSDate(user.lastBirthdayMessageSent).year <
            userDateTime.year);

      if (isBirthday) {
        console.log(
          `Found birthday for user ${user.firstName} ${user.lastName} in timezone ${user.timezone}`
        );
      }

      return isBirthday;
    });
  }

  // Method to check if scheduler is running
  public isSchedulerRunning(): boolean {
    return this.jobs.every((job) => job.nextInvocation() !== null);
  }

  // Clean up method for testing
  public stopScheduler(): void {
    this.jobs.forEach((job) => job.cancel());
    this.jobs = [];
    console.log('Scheduler stopped');
  }
}
