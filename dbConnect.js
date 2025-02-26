const { default: mongoose } = require("mongoose");
const History = require("./dbmodels/History");

require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Brak importu klucza bazy danych mongo_uri");
  process.exit(1);
}

async function connectToDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Połączono do bazy danych");
  } catch (error) {
    console.error("Błąd połączenia do Atlas MongoDb: ", error);
    process.exit(1);
  }
}

async function saveMessage(sesionID, role, content) {
  try {
    let sesion = await History.findOne({ sesionID });

    // Is messages history exsists. If not initialization of new messages history.
    if (!sesion) {
      sesion = new History({ sesionID, messages: [] });
    }

    sesion.messages.push({ role, content });
    await sesion.save();
  } catch (error) {
    console.error("Błąd :", error);
  }
}

//function tests

// connectToDB().then(async () => {
//   await saveMessage("12345", "user", "Jak działa mongoDB?");
//   await saveMessage("12345", "assistant", "Mongdb to naza NoSql..");
// });

async function readMessages(sesionID) {
  try {
    let sesion = await History.findOne({ sesionID });

    if (!sesion) {
      console.log(`Brak historii dla sesji: ${sesionID}`);
      return [];
    }

    return sesion.messages;
  } catch (error) {
    console.error("Błąd podczas odczytu historii", error);
  }
}

module.exports = { connectToDB, saveMessage, readMessages };
