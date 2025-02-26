const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const envResult = dotenv.config();
const { connectToDB, saveMessage, readMessages } = require("./dbConnect");
// Import the OpenAI SDK to be able to send queries to the OpenAI API.
const OpenAI = require("openai");
const { default: mongoose } = require("mongoose");

if (envResult.error) {
  console.error("Error while loading .env file", envResult.error);
  process.exit(1);
}

//Reading keys from environment variable
const botApiKey = process.env.TELEGRAM_BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

// Key validation
if (!botApiKey) {
  console.error("Missing or invalid TELEGRAM_BOT_TOKEN in .env file");
  process.exit(1);
}

if (!openaiKey) {
  console.log("Missing or invalid OPENAI_API_KEY in .env file");
  process.exit(1);
}

//Connect to DB function invoke

connectToDB();

const openai = new OpenAI({ apiKey: openaiKey });

// Function for communicating with OpenAI
async function askChatText(text, sesionID) {
  const historyMessages = await readMessages(sesionID);

  let replyMessage = "";

  if (typeof text === "string" && text.length > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are chatBot named GrzybekAIbot. Use Polish language",
          },
          ...historyMessages,
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      replyMessage = completion.choices[0].message;
    } catch (error) {
      console.error("OpenAI response error: ", error);
      throw error;
    }
  }
  return replyMessage;
}

// Initializing the Telegram bot using the Telegraf library
const bot = new Telegraf(botApiKey);

//Bot Startup

bot.command("start", (ctx) => {
  ctx.reply("Witaj! Jestem botem GrzybAI.\n W jaki sposób mogę ci pomóc ?");
});

//Bot stop command.
bot.command("stop", (ctx) => {
  ctx.reply("Kończę działanie bota");
  bot.stop("SIGTERM");
});

bot.on("text", async (ctx) => {
  const receivedMessage = ctx.message.text;
  const sesionId = ctx.from.id.toString();
  try {
    const replayText = await askChatText(receivedMessage, sesionId);
    const assistantMessage = { role: "assistant", content: replayText.content };
    const sentedMessage = { role: "user", content: receivedMessage };

    await saveMessage(sesionId, sentedMessage.role, sentedMessage.content);

    await saveMessage(
      sesionId,
      assistantMessage.role,
      assistantMessage.content
    );

    ctx.reply(assistantMessage.content);
  } catch (error) {
    console.error("Error in bot response: ", error);
    ctx.reply(
      "Przepraszam, wystąpił błąd podczas przetwarzania Twojej wiadomości. Spróbuj ponownie później."
    );
  }
});

bot.catch((error, ctx) => {
  console.log(`An error occurred for ${ctx.updateType}`, error);
});

bot
  .launch()
  .then(() => console.log("The bot has been launched successfully!"))
  .catch((error) => {
    console.error("An error occurred while launching the bot", error);
    process.exit(1);
  });

process.once("SIGINT", async () => {
  await mongoose.connection.close();
  bot.stop("SIGINT");
  console.log("Zamknięto połączenie do bazy danych i zatrzymano bota");
  process.exit(0);
});

process.once("SIGTERM", async () => {
  await mongoose.connection.close();
  bot.stop("SIGTERM");
  console.log("Zamknięto połączenie do bazy danych i zatrzymano bota");
  process.exit(0);
});
