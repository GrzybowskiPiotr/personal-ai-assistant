const { Telegraf } = require("telegraf");
const messageHandler = require("./handlers/messageHandler");
const photoHandler = require("./handlers/photoHandler");
const voiceHandler = require("./handlers/voiceHandler");
const commandHandler = require("./handlers/commandHandler");
const { default: mongoose } = require("mongoose");

class TelegramBot {
  constructor(token, openAIService) {
    if (!token) {
      throw new Error("Missing Telegram Bot Token");
    }
    if (!openAIService) {
      throw new Error("Missing OpenAI Service");
    }
    this.bot = new Telegraf(token);
    this.openAIService = openAIService;
    this.initializeHandlers();
  }

  initializeHandlers() {
    //Commneds.
    this.bot.command("start", commandHandler.handleStart);
    this.bot.command("stop", commandHandler.handleStop);
    //Messages.
    this.bot.on("text", (ctx) =>
      messageHandler.handleMessage(ctx, this.openAIService)
    );
    this.bot.on("photo", (ctx) =>
      photoHandler.handlePhoto(ctx, this.openAIService)
    );
    this.bot.on("voice", (ctx) =>
      voiceHandler.handleVoice(ctx, this.openAIService)
    );
    this.bot.on("callback_query", (ctx) =>
      photoHandler.handleCallbackQuery(ctx, this.openAIService)
    );
    //Error handling.
    this.bot.catch((err, ctx) => {
      console.error(`Error for ${ctx.updateType}:`, err);
    });
  }

  async start() {
    try {
      await this.bot.launch();
      console.log("Bot startup completed successfully!");
      this.setupShutdown();
    } catch (error) {
      console.error("Error while bot startup: ", error);
      process.exit(1);
    }
  }
  setupShutdown() {
    process.once("SIGINT", () => this.shutdown("SIGINT"));
    process.once("SIGTERM", () => this.shutdown("SIGTERM"));
  }

  async shutdown(signal) {
    console.log(`Received signal ${signal}, closing...`);
    await mongoose.connection.close();
    this.bot.stop(signal);
    console.log("Connection to database closed and bot stops.");
    process.exit(0);
  }
}
module.exports = TelegramBot;
