import { prisma } from "./prisma.js";

const BUYER_ID = "seed_buyer_vy";
const CONTRIBUTOR_ID = "seed_contributor_minh";
const CAMPAIGN_ID = "seed_campaign_livestream_gift";
const SESSION_ID = "seed_session_demo";

const audioQualityJson = JSON.stringify({
  voiceDetected: true,
  volumeOk: true,
  silenceOk: true,
  durationOk: true,
});

async function resetDemoData() {
  await prisma.$transaction([
    prisma.contributorAgreement.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.proofRecord.deleteMany(),
    prisma.review.deleteMany(),
    prisma.financeLedger.deleteMany(),
    prisma.recording.deleteMany(),
    prisma.conversationSession.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.walletAccount.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await resetDemoData();

  const buyer = await prisma.user.create({
    data: { id: BUYER_ID, role: "Buyer", fullName: "Vy Tran", email: "vy@voiceturk.demo" },
  });
  const contributor = await prisma.user.create({
    data: { id: CONTRIBUTOR_ID, role: "Contributor", fullName: "Minh Pham", email: "minh@voiceturk.demo" },
  });
  const campaign = await prisma.campaign.create({
    data: {
      id: CAMPAIGN_ID,
      buyerId: buyer.id,
      name: "Livestream Gift Complaint Dataset",
      description: "AI customer plays a frustrated livestream buyer missing a promised gift.",
      context: "Customer bought cosmetics through a livestream because the shop promised a mini gift, but the order arrived without it.",
      aiCustomerRole: "Frustrated customer who suspects the shop lied about the gift.",
      contributorRole: "Customer support person for the shop.",
      conversationBoundary: "Maximum 5 turns per side.",
      maxTurnsPerSide: 5,
      targetAcceptedRecordings: 60,
      rewardPerAcceptedRecording: 8000,
      budgetSecured: 528000,
      platformFee: 48000,
      status: "Active",
    },
  });
  const session = await prisma.conversationSession.create({
    data: {
      id: SESSION_ID,
      campaignId: campaign.id,
      contributorId: contributor.id,
      agoraChannel: "voiceturk__seed_campaign__seed_session",
      contributorRtcUid: 1002,
      agentName: "VoiceTurk AI Customer",
      agentJoinMode: "manual",
      maxTurnsPerSide: 5,
      status: "Finished",
      endedAt: new Date(),
    },
  });

  const accepted = await prisma.recording.create({
    data: {
      id: "seed_recording_accepted",
      campaignId: campaign.id,
      contributorId: contributor.id,
      sessionId: session.id,
      audioUrl: "/uploads/recordings/demo-accepted.wav",
      durationSeconds: 78,
      status: "Accepted",
      recordingNumber: 1,
      contextSnapshot: "Missing livestream gift · angry customer · customer support role",
      audioQualityJson,
    },
  });
  await prisma.review.create({
    data: {
      id: "seed_review_accepted",
      recordingId: accepted.id,
      buyerId: buyer.id,
      decision: "Accept",
      audioClarity: 5,
      roleFit: 4,
      scenarioHandling: 4,
      conversationNaturalness: 5,
      brandSafety: 5,
      totalScore: 23,
      note: "Good customer support handling.",
    },
  });

  await prisma.recording.createMany({
    data: [
      {
        id: "seed_recording_pending",
        campaignId: campaign.id,
        contributorId: contributor.id,
        sessionId: session.id,
        audioUrl: "/uploads/recordings/demo-pending.wav",
        durationSeconds: 66,
        status: "Pending review",
        recordingNumber: 2,
        contextSnapshot: "Missing livestream gift · angry customer · customer support role",
        audioQualityJson,
      },
      {
        id: "seed_recording_retake",
        campaignId: campaign.id,
        contributorId: contributor.id,
        sessionId: session.id,
        audioUrl: "/uploads/recordings/demo-retake.wav",
        durationSeconds: 52,
        status: "Retake requested",
        recordingNumber: 3,
        contextSnapshot: "Missing livestream gift · angry customer · customer support role",
        audioQualityJson,
      },
      {
        id: "seed_recording_rejected",
        campaignId: campaign.id,
        contributorId: contributor.id,
        sessionId: session.id,
        audioUrl: "/uploads/recordings/demo-rejected.wav",
        durationSeconds: 41,
        status: "Rejected",
        recordingNumber: 4,
        contextSnapshot: "Missing livestream gift · angry customer · customer support role",
        audioQualityJson,
      },
    ],
  });

  await prisma.financeLedger.createMany({
    data: [
      { id: "seed_ledger_budget", type: "Budget secured", status: "Completed", amount: 528000, campaignId: campaign.id, userId: buyer.id },
      { id: "seed_ledger_payout", type: "Contributor payout", status: "Completed", amount: 8000, campaignId: campaign.id, userId: contributor.id, recordingId: accepted.id },
      { id: "seed_ledger_platform", type: "Platform fee", status: "Completed", amount: 48000, campaignId: campaign.id, userId: buyer.id },
    ],
  });

  await prisma.certificate.createMany({
    data: [
      {
        id: "seed_certificate_budget",
        type: "CampaignBudgetSecured",
        title: "Campaign Budget Secured",
        campaignId: campaign.id,
        userId: buyer.id,
        subjectId: campaign.id,
        status: "Confirmed",
        partiesJson: JSON.stringify([buyer.fullName, "VoiceTurk"]),
        summary: "Campaign budget was secured for contributor rewards and platform fees.",
      },
      {
        id: "seed_certificate_recording",
        type: "RecordingAccepted",
        title: "Recording Accepted",
        campaignId: campaign.id,
        userId: contributor.id,
        subjectId: accepted.id,
        status: "Confirmed",
        partiesJson: JSON.stringify([buyer.fullName, contributor.fullName, "VoiceTurk"]),
        summary: "Buyer accepted this customer-support conversation recording.",
      },
    ],
  });

  console.log(`Seeded Buyer=${buyer.id} Contributor=${contributor.id} Campaign=${campaign.id} Session=${session.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
