const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const envResult = dotenv.config();
const { connectToDB, saveMessage, readMessages } = require("./dbConnect");
// Import the OpenAI SDK to be able to send queries to the OpenAI API.
const OpenAI = require("openai");
// Import mongoose for closing connection to DB;
const { default: mongoose, model } = require("mongoose");

//Import library for conwering message to tokens;
const { encoding_for_model } = require("@dqbd/tiktoken");

//Maximum size of one request. History and qestion to AI API;
const maxTokensInRequest = 3400;
const openAIModel = "gpt-4o-mini";

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

function formatHistoryToString(history) {
  let formatedHistory = history
    .map((item) => `${item.role} : ${item.content}`)
    .join();
  return formatedHistory;
}

function validateIsFileImage(fileId) {
  const fileFormat = fileId.file_path.split(".").pop();

  if (!["jpg", "jpeg", "png"].includes(fileFormat)) {
    ctx.reply("Błędny format pliku. Umiem obsłurzyć tylko pliki JPG lub PNG");
    return false;
  }
  return true;
}

async function processImagesAI(fileUrl, instructions) {
  try {
    const response = await openai.chat.completions.create({
      model: openAIModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instructions },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        },
      ],
      temperature: 0.3,
      store: true,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Błąd przetwarzania obrazu przez AI: ", error);
  }
}

// Function for communicating with OpenAI
// query structure {text: "exaple text", imageUrl: "url string to file send from telegram"}
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
  const tokenizer = encoding_for_model(openAIModel);
  let historySizeInTokens = tokenizer.encode(
    formatHistoryToString(historyMessages)
  ).length;

  let messageInTokens = tokenizer.encode(text).length;

  if (historySizeInTokens + messageInTokens >= maxTokensInRequest) {
    while (historySizeInTokens + messageInTokens >= maxTokensInRequest) {
      historyMessages.splice(0, 1);
      historySizeInTokens = tokenizer.encode(
        formatHistoryToString(historyMessages)
      ).length;
      messageInTokens = tokenizer.encode(text).length;
    }
    console.log("Token limit reach. Redusing history in request.");
  }
  tokenizer.free();

  // text query usage
  if (text && typeof text === "string" && text.length > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model: openAIModel,
        messages: [
          {
            role: "system",
            content:
              "You are chatBot named GrzybekAIbot. Use Polish language. Nie używaj frazy 'Na podstawie wcześniejszych informacji' oraz 'z opisu kótry podałeś';",
          },
          ...historyMessages,
          { role: "user", content: text },
        ],
        temperature: 0.3,
      });

      replyMessage = completion.choices[0].message;
    } catch (error) {
      console.error("OpenAI response error: ", error);
      throw error;
    }
  }

  // image query usage
  if (imageUrl && imageUrl.length > 0) {
    const requestAction = query.text;
    replyMessage = await processImagesAI(imageUrl, requestAction);
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
  console.log("text mode");
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
  console.log("Photo mode");

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
