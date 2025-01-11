# Birthday Notification Service

A service that sends birthday notifications to users at 9 AM in their local timezone.

## Features

- User management (create, update, delete)
- Timezone-aware birthday notifications
- Automatic retry mechanism for failed notifications
- Scalable design with rate limiting and batch processing

## Setup

1. Install dependencies: `npm install`
2. Set up database: `npx prisma migrate dev`
3. Start service: `npm start`

## Testing

Run tests with: `npm test`
