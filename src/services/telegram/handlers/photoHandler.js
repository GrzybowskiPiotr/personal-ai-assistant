const { saveMessage, readMessages } = require("../../../db/connection");
const validateIsFileImage = require("../../../utils/validators/validateIsFileImage");

const photoHandler = {
  handlePhoto: async (ctx) => {
    const sessionId = ctx.from.id.toString();

    try {
      const receivedPhoto = ctx.message.photo;
      const photoId = receivedPhoto[receivedPhoto.length - 1].file_id;

      const fileId = await ctx.telegram.getFile(photoId);
      const fileURL = `https://api.telegram.org/file/bot${ctx.telegram.token}/${fileId.file_path}`;

      if (validateIsFileImage(fileId)) {
        saveMessage(sessionId, "user", fileURL);
      }

      await ctx.reply("Odebrałem obraz.\n Co chcesz abym z nim zrobił?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📄 Opisz obraz", callback_data: "describe" }],
            [{ text: "📊 Analizuj dokument", callback_data: "analyze_doc" }],
          ],
        },
      });
    } catch (error) {
      console.error("Błąd podczas pobierania obrazu:", error);
      ctx.reply("Błąd przetwarzania obrazu");
    }
  },

  handleCallbackQuery: async (ctx, openAIService) => {
    try {
      const selectedAction = ctx.callbackQuery.data;
      const sessionID = ctx.from.id.toString();
      const historyMessages = await readMessages(sessionID);
      const sendedImageUrl =
        historyMessages[historyMessages.length - 1].content;

      if (!sendedImageUrl) {
        ctx.reply("Nie mogę znaleźć obrazu w historii rozmowy.");
        return;
      }

      let prompt;
      switch (selectedAction) {
        case "describe": {
          prompt = "Co jest na tym obrazku";
          break;
        }
        case "analyze_doc": {
          prompt =
            "Przeanalizuj dokument. Jeśli nie wykryjesz tekstu, poinformuj w przyjazny sposób";
          break;
        }
      }

      const response = await openAIService.processImage(sendedImageUrl, prompt);
      const replyContent = response.choices[0].message.content;

      await saveMessage(sessionID, "user", prompt);
      await saveMessage(sessionID, "assistant", replyContent);
      ctx.reply(replyContent);
    } catch (error) {
      console.error("Błąd obsługi callback_query:", error);
      ctx.reply("Wystąpił błąd. Spróbuj ponownie.");
    }
  },
};

module.exports = photoHandler;
