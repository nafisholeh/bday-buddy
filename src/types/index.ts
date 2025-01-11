export interface User {
  id: string;
  firstName: string;
  lastName: string;
  birthday: Date;
  timezone: string;
  email: string;
  lastBirthdayMessageSent?: Date;
}

export interface FailedMessage {
  id: string;
  userId: string;
  attempt: number;
  createdAt: Date;
  nextRetry?: Date;
}

export type CreateUserDTO = Pick<
  User,
  'firstName' | 'lastName' | 'birthday' | 'timezone' | 'email'
>;
export type UpdateUserDTO = Partial<CreateUserDTO>;
