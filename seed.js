// seed.js — run ONCE to create test chat + group data

// Simple approach using fetch API to work with Firestore REST API
const projectId = 'empatherasocial-dev';

// --- CHANGE THESE to your real test users
const userA = "jasonfoodforest714@gmail.com";
const userB = "helper.empatherasocial@gmail.com";

async function createDocument(collection, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  
  // Convert data to Firestore format
  const firestoreData = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      firestoreData[key] = {
        arrayValue: {
          values: value.map(v => ({ stringValue: v }))
        }
      };
    } else if (value === 'SERVER_TIMESTAMP') {
      firestoreData[key] = {
        timestampValue: new Date().toISOString()
      };
    } else {
      firestoreData[key] = { stringValue: String(value) };
    }
  }

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: firestoreData })
    });

    if (!response.ok) {
      console.log(`Failed to create document in ${collection}/${docId}: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.log(`Error creating document: ${error.message}`);
    return false;
  }
}

async function seed() {
  console.log("🌱 Starting seed process...");
  
  const rk = [userA, userB].sort().join("_");

  try {
    // 1. Create chat doc
    console.log("Creating chat document...");
    await createDocument('chats', rk, {
      participants: [userA, userB],
      lastAt: 'SERVER_TIMESTAMP',
      lastMsg: "Hello test world"
    });

    // 2. Create a group
    console.log("Creating group document...");
    const groupId = "test-group-1";
    await createDocument('groups', groupId, {
      name: "Test Group",
      members: [userA, userB],
      createdAt: 'SERVER_TIMESTAMP'
    });

    console.log("✅ Seed complete! Created basic chat and group documents.");
    console.log("Note: For full functionality, you may need to add documents via the Firebase console with proper authentication.");
    
  } catch (error) {
    console.error("Error seeding data:", error.message);
  }
}

seed().catch(err => console.error("Seed error:", err));