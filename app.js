const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const envResult = dotenv.config();
// Import the OpenAI SDK to be able to send queries to the OpenAI API.
const OpenAI = require("openai");

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

const openai = new OpenAI({ apiKey: openaiKey });

// Function for communicating with OpenAI
async function askChatText(text) {
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
          { role: "user", content: text },
        ],
        temperature: 0.5,
        max_tokens: 50,
      });

      replyMessage = completion.choices[0].message.content;
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

// Komenda startowa Bota.
bot.on("text", async (ctx) => {
  const receivedMessage = ctx.message.text;
  try {
    const replayText = await askChatText(receivedMessage);
    ctx.reply(replayText);
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

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
