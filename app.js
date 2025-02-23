const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");

const envResult = dotenv.config();

if (envResult.error) {
  console.error("Błąd podczas ładowania pliku .env", envResult.error);
  process.exit(1);
}

const botApiKey = process.env.TELEGRAM_BOT_TOKEN;

if (!botApiKey) {
  console.error("Brak TELEGRAM_BOT_TOKEN w pliku .env");
  process.exit(1);
}

const bot = new Telegraf(botApiKey);

bot.command("start", (ctx) => {
  ctx.reply(
    "Witaj! Jestem botem GrzybAI. Teraz robię za Echo. Napisz coś, a ja to powtórzę"
  );
});

bot.on("text", (ctx) => {
  const receivedMessage = ctx.message.text;
  ctx.reply(`Napisałeś do mnie: ${receivedMessage}`);
});

bot.catch((error, ctx) => {
  console.log(`Wystąpił błąd dla ${ctx.updateType}`, error);
});

bot
  .launch()
  .then(() => console.log("Bot został uruchomiony pomyślnie!"))
  .catch((error) => {
    console.error("Wystąpił błąd podczas uruchamiania bota", error);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
