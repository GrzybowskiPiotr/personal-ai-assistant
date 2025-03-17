const { default: mongoose } = require("mongoose");
const History = require("./models/History");

// require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("No import of mongo_uri database key");
  process.exit(1);
}

async function connectToDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Atlas MongoDb connection error: ", error);
    process.exit(1);
  }
}

async function saveMessage(sessionId, role, content) {
  try {
    let sesion = await History.findOne({ sessionId });

    // Is messages history exsists. If not initialization of new messages history.
    if (!sesion) {
      sesion = new History({ sessionId, messages: [] });
    }

    sesion.messages.push({ role, content });
    await sesion.save();
  } catch (error) {
    console.error("Error while saving message :", error);
  }
}

async function readMessages(sessionId) {
  try {
    let sesion = await History.findOne({ sessionId });

    if (!sesion) {
      console.log(`Brak historii dla sesji: ${sessionId}`);
      return [];
    }

    return sesion.messages;
  } catch (error) {
    console.error("Błąd podczas odczytu historii", error);
  }
}

module.exports = { connectToDB, saveMessage, readMessages };
