const { default: mongoose } = require("mongoose");
const History = require("./dbmodels/History");
const { message } = require("telegraf/filters");

require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Brak importu klucza bazy danych mongo_uri");
  process.exit(1);
}
//połączenie do bazy
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

    if (!sesion) {
      sesion = new History({ sesionID, messages: [] });
    }
    console.log("Wielkość tablicy wiadomości");
    console.log(sesion.messages.length);

    sesion.messages.push({ role, content });
    await sesion.save();

    console.log("Wiadomość zapisana");
  } catch (error) {
    console.error("Błąd :", error);
  }
}

//testy użycia funkcji

connectToDB().then(async () => {
  await saveMessage("12345", "user", "Jak działa mongoDB?");
  await saveMessage("12345", "assistant", "Mongdb to naza NoSql..");
});

async function readMessages(sesionID) {
  try {
    let sesion = await History.findOne({ sesionID });

    if (!sesion) {
      console.log(`Brak historii dla sesji: ${sesionID}`);
      return null;
    }

    return sesion.messages;
  } catch (error) {
    console.error("Błą podczas odczytu historii", error);
  }
}

setTimeout(async () => {
  const messages = await readMessages("12345");
  console.log("Wielkość tablicy wiadomości");

  console.log(`zapamiętana konwersacja ${messages}`);
  process.exit(1);
}, 1500);
