import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({
    credential: getCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const campusId = process.env.CAMPUS_ID || "kju";
const adminUid = process.env.SEED_ADMIN_UID || "";

const spaces = [
  {
    id: "dev-club",
    name: "Dev Club",
    description: "Projects, internships, referrals, hackathons and code help.",
    category: "dev",
    icon: "technologist",
    accent: "#8b5cf6",
    memberCount: 0,
    rules: ["Be respectful", "No spam", "Share useful opportunities", "No unsafe links"],
  },
  {
    id: "sports-club",
    name: "Sports Club",
    description: "Matches, teams, practice plans and campus tournaments.",
    category: "sports",
    icon: "football",
    accent: "#06b6d4",
    memberCount: 0,
    rules: ["Be respectful", "Keep match plans clear", "No spam", "Follow campus safety"],
  },
  {
    id: "party-tonight",
    name: "Party Tonight",
    description: "Campus hangouts, safe plans and verified event updates.",
    category: "social",
    icon: "networking",
    accent: "#ec4899",
    memberCount: 0,
    rules: ["No unsafe invites", "No spam", "Keep plans verified", "Respect privacy"],
  },
  {
    id: "study-group",
    name: "Study Group",
    description: "Notes, exam prep, PDFs and study room coordination.",
    category: "study",
    icon: "books",
    accent: "#14b8a6",
    memberCount: 0,
    rules: ["Share useful notes", "No copyrighted spam", "Be respectful", "No misinformation"],
  },
  {
    id: "music-lovers",
    name: "Music Lovers",
    description: "Playlists, jam rooms, events and campus music drops.",
    category: "music",
    icon: "networking",
    accent: "#f59e0b",
    memberCount: 0,
    rules: ["No spam links", "Credit creators", "Be respectful", "Keep it campus-friendly"],
  },
];

async function main() {
  const campusRef = db.collection("campuses").doc(campusId);

  await campusRef.set(
    {
      id: campusId,
      name: "Kristu Jayanti University",
      shortName: "KJU",
      city: "Bangalore",
      emailDomains: ["kristujayanti.com", "kjc.edu.in"],
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const space of spaces) {
    const spaceRef = db.collection("spaces").doc(space.id);

    await spaceRef.set(
      {
        ...space,
        campusId,
        createdBy: "system",
        isOfficial: true,
        status: "active",
        activeCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (adminUid) {
      await spaceRef.collection("members").doc(adminUid).set(
        {
          spaceId: space.id,
          userId: adminUid,
          campusId,
          role: "admin",
          status: "active",
          displayName: "CampusX Admin",
          photoURL: "",
          joinedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastReadAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log(`Seeded space: ${space.name}`);
  }

  console.log("Done seeding KJU spaces.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
