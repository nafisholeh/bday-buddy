import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { CreateUserDTO, UpdateUserDTO } from '../types';

const prisma = new PrismaClient();

export class UserController {
  async create(req: Request<{}, {}, CreateUserDTO>, res: Response) {
    try {
      const { firstName, lastName, birthday, timezone, email } = req.body;

      // Validate timezone
      if (!DateTime.local().setZone(timezone).isValid) {
        return res.status(400).json({ error: 'Invalid timezone' });
      }

      // Validate birthday format
      const birthdayDate = new Date(birthday);
      if (isNaN(birthdayDate.getTime())) {
        return res.status(400).json({ error: 'Invalid birthday format' });
      }

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          birthday: birthdayDate,
          timezone,
          email
        }
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.user.delete({
        where: { id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  async update(req: Request<{ id: string }, {}, UpdateUserDTO>, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, birthday, timezone, email } = req.body;

      // Validate timezone if provided
      if (timezone && !DateTime.local().setZone(timezone).isValid) {
        return res.status(400).json({ error: 'Invalid timezone' });
      }

      // Validate birthday format if provided
      let birthdayDate: Date | undefined;
      if (birthday) {
        birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
          return res.status(400).json({ error: 'Invalid birthday format' });
        }
      }

      // Build the data object dynamically
      const data: UpdateUserDTO & { birthday?: Date } = {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        timezone,
        birthday: birthdayDate
      };

      const user = await prisma.user.update({
        where: { id },
        data
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
}
