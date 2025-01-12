# Birthday Notification Service

A service that sends birthday notifications to users at 9 AM in their local timezone.

## Features

- User management (create, update, delete)
- Timezone-aware birthday notifications
- Automatic retry mechanism for failed notifications
- Scalable design with rate limiting and batch processing

## Setup

1. Install dependencies: `npm install`
2. Create .env file:

```
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/birthday_service"
PORT=3000
```

3. Create database

```
psql -U postgres
CREATE DATABASE birthday_service;
\q
```

4. Initialize Prisma and run migrations

```
npx prisma generate
npx prisma migrate dev --name init
```

5. Compile typescript: `npm run build`
6. Start service: `npm start`, or for development with auto-reload `npm run dev`

## Testing

Run tests with: `npm test`

# API Documentation

## Endpoints

### Create User

- **POST** `/api/user`
- **Body**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "birthday": "YYYY-MM-DD",
    "timezone": "string" // IANA timezone format
  }
  ```
- **Response**: 201 Created

### Update User

- **PUT** `/api/user/:id`
- **Body**: Same as Create User
- **Response**: 200 OK

### Delete User

- **DELETE** `/api/user/:id`
- **Response**: 204 No Content

## Error Handling

- 400: Bad Request - Invalid input data
- 404: Not Found - User not found
- 500: Internal Server Error

## Rate Limiting

- Email sending is rate-limited to prevent overwhelming the email service
- Failed messages are retried with exponential backoff

## Testing

Run tests with:

```bash
npm test
```

Coverage report will be generated in the `coverage` directory.
