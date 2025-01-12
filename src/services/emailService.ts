import axios from 'axios';
import { User } from '../types';

export class EmailService {
  private readonly apiUrl = 'https://email-service.digitalenvision.com.au';

  async sendBirthdayEmail(user: User): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/send-email`,
        {
          email: user.email,
          message: `Hey, ${user.firstName} ${user.lastName} it's your birthday`
        },
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to send birthday email to ${user.email}:`, error);
      return false;
    }
  }
}
