const fs = require("fs");
const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const envResult = dotenv.config();
const getTranscryption = require("./utils/getTranscryption.js");
const tokenUsageOptymalization = require("./utils/tokenUsageOptymalization.js");
const validateIsFileImage = require("./utils/validateIsFileImage.js");
const processImagesAI = require("./proc/processImagesAI.js");
const processTextAi = require("./proc/processTextAi.js");
const voiceMessageFileConverter = require("./utils/voiceMessageFileConverter.js");
const {
  connectToDB,
  saveMessage,
  readMessages,
} = require("./divers/dbConnect.js");
// Import the OpenAI SDK to be able to send queries to the OpenAI API.
const OpenAI = require("openai");
// Import mongoose for closing connection to DB;
const { default: mongoose } = require("mongoose");

//Import library for conwering message to tokens;
const { encoding_for_model } = require("@dqbd/tiktoken");

//Maximum size of one request. History and qestion to AI API;
const maxTokensInRequest = 3400;
const openAIModel = "gpt-4o-mini";
const audioAiModel = "whisper-1";

if (envResult.error) {
  console.error("Error while loading .env file", envResult.error);
  process.exit(1);
}

//Reading keys from environment variable
const botApiKey = process.env.TELEGRAM_BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

//Bot API Key validation
if (!botApiKey) {
  console.error("Missing or invalid TELEGRAM_BOT_TOKEN in .env file");
  process.exit(1);
}
//AI API Key validation
if (!openaiKey) {
  console.log("Missing or invalid OPENAI_API_KEY in .env file");
  process.exit(1);
}

//Connect to DB function invoke

connectToDB();

const openai = new OpenAI({ apiKey: openaiKey });

// Primary function for interacting with OpenAI.

// query structure {text: "instruction for AI model", imageUrl: "url string to file send from telegram"}

async function askChat(query, sessionID) {
  if (!query) {
    throw new Error("Brak zapytania 'query'");
  }
  if (!sessionID) {
    throw new Error("Brak sessionID");
  }

  let text = query.text ?? null;
  let imageUrl = query.imageUrl ?? null;

  const historyMessages = await readMessages(sessionID);

  let replyMessage = "";

  //token optymalization

  const tokenizer = encoding_for_model(openAIModel);

  const optimizedHistory = tokenUsageOptymalization(
    historyMessages,
    text,
    maxTokensInRequest,
    tokenizer
  );

  tokenizer.free();

  //text query usage
  replyMessage = await processTextAi(
    text,
    openai,
    openAIModel,
    optimizedHistory
  );

  // image query usage
  if (imageUrl && imageUrl.length > 0) {
    const requestAction = query.text;
    replyMessage = await processImagesAI(
      imageUrl,
      requestAction,
      openai,
      openAIModel
    );
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
  const sessionId = ctx.from.id.toString();
  try {
    const replayText = await askChat({ text: receivedMessage }, sessionId);
    const sentedMessage = { role: "user", content: receivedMessage };
    const assistantMessage = { role: "assistant", content: replayText.content };

    await saveMessage(sessionId, sentedMessage.role, sentedMessage.content);

    await saveMessage(
      sessionId,
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

bot.on("photo", async (ctx) => {
  const sessionId = ctx.from.id.toString();

  try {
    const recivedPhoto = ctx.message.photo;
    const photoId = recivedPhoto[recivedPhoto.length - 1].file_id;

    const fileId = await ctx.telegram.getFile(photoId);
    const fileURL = `https://api.telegram.org/file/bot${botApiKey}/${fileId.file_path}`;

    if (validateIsFileImage(fileId)) {
      saveMessage(sessionId, "user", fileURL);
    }

    await ctx.reply("Odebrałem obraz.\n Co chcesz abym z nim zrobił ?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📄 Opisz obraz", callback_data: "describe" }],
          [{ text: "📊 Analizuj dokumnet", callback_data: "analyze_doc" }],
        ],
      },
    });
  } catch (error) {
    console.error("Bład podczas pobierania obrazu: ", error);
    ctx.reply("Błąd przetwarzania obrazu");
  }
});

bot.on("callback_query", async (ctx) => {
  try {
    const selectedAction = ctx.callbackQuery.data;
    const sessionID = ctx.from.id.toString();
    const historyMessages = await readMessages(sessionID);
    const sendedImageUrl = historyMessages[historyMessages.length - 1].content;
    if (!sendedImageUrl) {
      ctx.reply("Nie mogę znaleść obrazu w historii rozmowy..");
      return;
    }

    switch (selectedAction) {
      case "describe": {
        const reviceDescription = await askChat(
          {
            text: "Co jest na tym obrazku",
            imageUrl: sendedImageUrl,
          },
          sessionID
        );

        ctx.reply(reviceDescription);

        await saveMessage(sessionID, "user", "Co jest na tym obrazku");
        await saveMessage(
          sessionID,
          "assistant",
          `Zapamiętałem, że ${reviceDescription}`
        );
        break;
      }
      case "analyze_doc":
        const reviceDescription = await askChat(
          {
            text: "Przeanalizuj dokument.Jeśli nie wykryjesz tekstu, poinformuj w przyjazny sposób",
            imageUrl: sendedImageUrl,
          },
          sessionID
        );
        await saveMessage(
          sessionID,
          "user",
          "Przeanalizuj dokument.Jeśli nie wykryjesz tekstu, poinformuj w przyjazny sposób"
        );
        await saveMessage(sessionID, "assistant", reviceDescription);
        ctx.reply(reviceDescription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Błąd obsługi callback_query: ", error);
    ctx.reply("Wystąpił błąd.Spróbuj ponownie.");
  }
});

bot.on("voice", async (ctx) => {
  let transText = "brak textu";
  const sessionID = ctx.from.id.toString();
  try {
    const voiceMessage = ctx.message.voice;
    const fileId = voiceMessage.file_id;
    const recivedfile = await ctx.telegram.getFileLink(fileId);
    const fileLink = recivedfile.href;

    const convertedFilePath = await voiceMessageFileConverter(fileLink, fileId);
    if (!convertedFilePath || !fs.existsSync(convertedFilePath)) {
      throw new Error(
        "Plik konwertowany nie istnieje lub nie został utworzony."
      );
    }

    transText = await getTranscryption(convertedFilePath, audioAiModel);
  } catch (error) {
    console.error("Error processing voice message " + error);
  }

  try {
    // console.log(transText.text);
    const replayText = await askChat({ text: transText.text }, sessionID);
    // console.log(replayText.content);
    ctx.reply(replayText.content);
  } catch (error) {
    console.error("Błąd odpowiedzi z AI: " + error);
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
