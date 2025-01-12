-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lastBirthdayMessageSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),

    CONSTRAINT "FailedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_birthday_idx" ON "User"("birthday");

-- CreateIndex
CREATE INDEX "User_timezone_idx" ON "User"("timezone");

-- CreateIndex
CREATE INDEX "FailedMessage_nextRetry_idx" ON "FailedMessage"("nextRetry");
