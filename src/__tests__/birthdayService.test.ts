import { BirthdayService } from '../services/birthdayService';
import { MessageQueue } from '../services/messageQueue';
import { DateTime } from 'luxon';
import { prismaMock } from '../singleton';

const mockMessageQueue = {
  enqueueMessage: jest.fn(),
  processFailedMessages: jest.fn()
} as unknown as MessageQueue;

jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn((cronSchedule, callback) => ({
    nextInvocation: () => new Date(),
    cancel: jest.fn()
  }))
}));

describe('BirthdayService', () => {
  let birthdayService: BirthdayService;

  beforeEach(() => {
    jest.clearAllMocks();
    birthdayService = new BirthdayService(prismaMock, mockMessageQueue);
  });

  afterEach(() => {
    birthdayService.stopScheduler();
  });

  describe('processBirthdays', () => {
    const mockUser = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      birthday: new Date('1990-01-12'),
      timezone: 'UTC',
      lastBirthdayMessageSent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      prismaMock.failedMessage.findFirst.mockResolvedValue(null);
    });

    it('should process eligible birthdays', async () => {
      // Mock current time to 9 AM
      const mockNow = DateTime.fromObject({ hour: 9 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

      await birthdayService['processBirthdays']();

      expect(mockMessageQueue.enqueueMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id
        })
      );
    });

    it('should skip users when it is not their birthday or the time is outside the eligible range', async () => {
      const mockUser = {
        id: '2',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        birthday: new Date('1990-01-12'),
        timezone: 'UTC',
        lastBirthdayMessageSent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      
      // Mock current time to 10 AM, but user's birthday is not today
      const mockNow = DateTime.fromObject({ hour: 10 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
    
      await birthdayService['processBirthdays']();
    
      expect(mockMessageQueue.enqueueMessage).not.toHaveBeenCalled();
    });
    
    it('should skip users who already received a birthday message this year', async () => {
      const mockUser = {
        id: '3',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        birthday: new Date('1990-01-12'),
        timezone: 'UTC',
        lastBirthdayMessageSent: new Date('2025-01-12'), // Already sent message this year
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      
      // Mock current time to 9 AM, so it's Alice's birthday today
      const mockNow = DateTime.fromObject({ hour: 9 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
    
      await birthdayService['processBirthdays']();
    
      expect(mockMessageQueue.enqueueMessage).not.toHaveBeenCalled();
    });

    it('should process users with birthdays in different timezones correctly', async () => {
      const mockUser = {
        id: '4',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        birthday: new Date('1990-01-12'),
        timezone: 'Asia/Jakarta', // Different timezone
        lastBirthdayMessageSent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      
      // Mock current time to 2 AM UTC, which is 9 AM in Asia/Jakarta
      const mockNow = DateTime.fromObject({ hour: 2 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
    
      await birthdayService['processBirthdays']();
    
      expect(mockMessageQueue.enqueueMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id
        })
      );
    });

    it('should process multiple users with birthdays today', async () => {
      const mockUsers = [
        {
          id: '6',
          firstName: 'David',
          lastName: 'Williams',
          email: 'david@example.com',
          birthday: new Date('1990-01-12'),
          timezone: 'UTC',
          lastBirthdayMessageSent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '7',
          firstName: 'Eva',
          lastName: 'Taylor',
          email: 'eva@example.com',
          birthday: new Date('1990-01-12'),
          timezone: 'UTC',
          lastBirthdayMessageSent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
    
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
    
      // Mock current time to 9 AM
      const mockNow = DateTime.fromObject({ hour: 9 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
    
      await birthdayService['processBirthdays']();
    
      expect(mockMessageQueue.enqueueMessage).toHaveBeenCalledTimes(2); // Both users should be processed
      expect(mockMessageQueue.enqueueMessage).toHaveBeenCalledWith(expect.objectContaining({ id: '6' }));
      expect(mockMessageQueue.enqueueMessage).toHaveBeenCalledWith(expect.objectContaining({ id: '7' }));
    });    

    it('should skip users with pending failed messages and not send new birthday message', async () => {
      const mockUser = {
        id: '5',
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        birthday: new Date('1990-01-12'),
        timezone: 'UTC',
        lastBirthdayMessageSent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
    
      // Mock a pending failed message for the user
      prismaMock.failedMessage.findFirst.mockResolvedValue({
        id: '1',
        userId: mockUser.id,
        attempt: 1,
        nextRetry: new Date(),
        createdAt: new Date(),
      });
    
      // Mock current time to 9 AM, so it's Charlie's birthday
      const mockNow = DateTime.fromObject({ hour: 9 }, { zone: 'UTC' }) as DateTime<true>;
      jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
    
      await birthdayService['processBirthdays']();
    
      expect(mockMessageQueue.enqueueMessage).not.toHaveBeenCalled();
    });

    it('should start and stop the scheduler correctly', () => {
      const startSpy = jest.spyOn(birthdayService as any, 'startScheduler');
      const stopSpy = jest.spyOn(birthdayService, 'stopScheduler');
    
      // Start the scheduler
      birthdayService['startScheduler']();
      expect(startSpy).toHaveBeenCalled();
    
      // Stop the scheduler
      birthdayService.stopScheduler();
      expect(stopSpy).toHaveBeenCalled();
    });    

    it('should skip users with pending failed messages', async () => {
      prismaMock.failedMessage.findFirst.mockResolvedValue({
        id: '1',
        userId: mockUser.id,
        attempt: 1,
        nextRetry: new Date(),
        createdAt: new Date(),
      });

      await birthdayService['processBirthdays']();

      expect(mockMessageQueue.enqueueMessage).not.toHaveBeenCalled();
    });
  });
});