import { UserController } from '../controllers/userController';
import { Request, Response } from 'express';
import { prismaMock } from '../singleton'

jest.mock('@prisma/client');

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    userController = new UserController();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should create a user successfully', async () => {
    mockRequest = {
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthday: '1990-01-01',
        timezone: 'UTC'
      }
    };

    prismaMock.user.create.mockResolvedValue({ ...mockRequest.body, id: '1' });
    
    await userController.create(mockRequest as Request, mockResponse as Response);
    
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('should handle invalid timezone', async () => {
    mockRequest = {
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthday: '1990-01-01',
        timezone: 'Invalid/Timezone'
      }
    };

    await userController.create(mockRequest as Request, mockResponse as Response);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });
});