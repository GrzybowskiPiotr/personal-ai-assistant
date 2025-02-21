const { Telegraf } = require("telegraf");
require("dotenv").config();

const botApiKey = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.command("start", (ctx) => {
  ctx.reply(
    "Witaj! Jestem botem GrzybAI. Teraz robię za Echo. Napisz coś, a ja to powturzę"
  );
});

bot.on("text", (ctx) => {
  const reciveMessage = ctx.message.text;
  ctx.reply(`Napisałeś do mnie ${reciveMessage}`);
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
