-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "walletAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "smartWallet" TEXT,
    "provider" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "aiCustomerRole" TEXT NOT NULL,
    "contributorRole" TEXT NOT NULL,
    "conversationBoundary" TEXT NOT NULL,
    "maxTurnsPerSide" INTEGER NOT NULL DEFAULT 5,
    "targetAcceptedRecordings" INTEGER NOT NULL,
    "rewardPerAcceptedRecording" INTEGER NOT NULL,
    "budgetSecured" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContributorAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rewardRule" TEXT NOT NULL,
    "termsText" TEXT NOT NULL,
    "customDetails" TEXT,
    "acceptedAt" DATETIME,
    "certificateId" TEXT,
    CONSTRAINT "ContributorAgreement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContributorAgreement_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContributorAgreement_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "agoraChannel" TEXT NOT NULL,
    "contributorRtcUid" INTEGER NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentJoinMode" TEXT NOT NULL,
    "maxTurnsPerSide" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "ConversationSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversationSession_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "audioUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending review',
    "recordingNumber" INTEGER NOT NULL,
    "contextSnapshot" TEXT NOT NULL,
    "audioQualityJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recording_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "audioClarity" INTEGER NOT NULL,
    "roleFit" INTEGER NOT NULL,
    "scenarioHandling" INTEGER NOT NULL,
    "conversationNaturalness" INTEGER NOT NULL,
    "brandSafety" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinanceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT,
    "recordingId" TEXT,
    "walletAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceLedger_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "partiesJson" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proofRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_proofRecordId_fkey" FOREIGN KEY ("proofRecordId") REFERENCES "ProofRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProofRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "walletAddress" TEXT,
    "proofRef" TEXT NOT NULL,
    "txSignature" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_walletAddress_key" ON "WalletAccount"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ContributorAgreement_certificateId_key" ON "ContributorAgreement"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "ContributorAgreement_campaignId_contributorId_key" ON "ContributorAgreement"("campaignId", "contributorId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSession_agoraChannel_key" ON "ConversationSession"("agoraChannel");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_campaignId_recordingNumber_key" ON "Recording"("campaignId", "recordingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Review_recordingId_key" ON "Review"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceLedger_recordingId_key" ON "FinanceLedger"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_proofRecordId_key" ON "Certificate"("proofRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_type_subjectId_key" ON "Certificate"("type", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofRecord_type_subjectId_key" ON "ProofRecord"("type", "subjectId");
