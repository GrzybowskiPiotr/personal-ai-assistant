const fs = require("fs");
const { saveMessage } = require("../../../db/connection");
const voiceMessageFileConverter = require("../../../utils/voice/voiceMessageFileConverter");

const voiceHandler = {
  handleVoice: async (ctx, openAIService) => {
    const sessionID = ctx.from.id.toString();

    try {
      const voiceMessage = ctx.message.voice;
      const fileId = voiceMessage.file_id;
      const receivedFile = await ctx.telegram.getFileLink(fileId);
      const fileLink = receivedFile.href;

      const convertedFilePath = await voiceMessageFileConverter(
        fileLink,
        fileId
      );
      if (!convertedFilePath || !fs.existsSync(convertedFilePath)) {
        throw new Error(
          "Plik konwertowany nie istnieje lub nie został utworzony."
        );
      }

      const transcription = await openAIService.transcribeAudio(
        convertedFilePath
      );
      const response = await openAIService.processText(transcription.text, []);
      const replyContent = response.choices[0].message.content;

      await saveMessage(sessionID, "user", transcription.text);
      await saveMessage(sessionID, "assistant", replyContent);

      ctx.reply(replyContent);
    } catch (error) {
      console.error("Błąd przetwarzania wiadomości głosowej:", error);
      ctx.reply(
        "Przepraszam, wystąpił błąd podczas przetwarzania wiadomości głosowej."
      );
    }
  },
};

module.exports = voiceHandler;
