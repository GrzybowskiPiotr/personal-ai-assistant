const { saveMessage, readMessages } = require("../../../db/connection");

const messageHandler = {
  handleMessage: async (ctx, openAIService) => {
    const receivedMessage = ctx.message.text;
    const sessionId = ctx.from.id.toString();

    try {
      const history = await readMessages(sessionId);
      const response = await openAIService.processText(
        receivedMessage,
        history
      );

      // Zapisz wiadomość użytkownika
      await saveMessage(sessionId, "user", receivedMessage);

      // Sprawdź, czy odpowiedź zawiera obraz
      const replyContent = response.choices[0].message.content;

      if (typeof replyContent === "object" && replyContent.image) {
        // Odpowiedź z obrazem
        await ctx.replyWithPhoto(replyContent.image);
        await ctx.reply(
          replyContent.text || "Oto wygenerowany obraz. Jak ci się podoba?"
        );
        await saveMessage(
          sessionId,
          "assistant",
          `Generated image: ${replyContent.image}\n${replyContent.text || ""}`
        );
      } else {
        // Standardowa odpowiedź tekstowa
        await saveMessage(sessionId, "assistant", replyContent);
        await ctx.reply(replyContent);
      }
    } catch (error) {
      console.error("Błąd w odpowiedzi bota:", error);
      ctx.reply(
        "Przepraszam, wystąpił błąd podczas przetwarzania Twojej wiadomości. Spróbuj ponownie później."
      );
    }
  },
};

module.exports = messageHandler;
