const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const envResult = dotenv.config();
const OpenAI = require("openai");
// const { message } = require("telegraf/filters");

if (envResult.error) {
  console.error("Błąd podczas ładowania pliku .env", envResult.error);
  process.exit(1);
}

//Zaczytanie kluczy z zmiennej środowiskowej
const botApiKey = process.env.TELEGRAM_BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

//Walicaja kluczy
if (!botApiKey || botApiKey.length === 0) {
  console.error("Brak lub nieprawidłowy TELEGRAM_BOT_TOKEN w pliku .env");
  process.exit(1);
}

if (!openaiKey || openaiKey === 0) {
  console.log("Brak lub nieprawidłowy OPENAI_API_KEY w pliku .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// Funkcja do komunikacji z OpenAI
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
      console.error("Błąd wywołania OpenAI: ", error);
      throw error;
    }
  }
  return replyMessage;
}

//tworzenie połaczenia do bota.
const bot = new Telegraf(botApiKey);

//rozurch bota.

bot.command("start", (ctx) => {
  ctx.reply("Witaj! Jestem botem GrzybAI.\n W jaki sposób mogę ci pomóc ?");
});

// Komenda wyłączania bota.
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
    console.error("Błąd w odpowiedzi bota: ", error);
    ctx.reply(
      "Przepraszam, wystąpił błąd podczas przetwarzania Twojej wiadomości. Spróbuj ponownie później."
    );
  }
});

bot.catch((error, ctx) => {
  console.log(`Wystąpił błąd dla ${ctx.updateType}`, error);
});

bot
  .launch()
  .then(() => console.log("Bot został uruchomiony pomyślnie!"))
  .catch((error) => {
    console.error("Wystąpił błąd podczas uruchamiania bota", error);
    process.exit(1);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
