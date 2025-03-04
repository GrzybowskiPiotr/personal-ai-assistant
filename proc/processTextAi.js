module.exports = async function processTextAi(
  inputText,
  AiInstance,
  AiModel,
  historyMessages
) {
  if (inputText && typeof inputText === "string" && inputText.length > 0) {
    try {
      const completion = await AiInstance.chat.completions.create({
        model: AiModel,
        messages: [
          {
            role: "system",
            content:
              "You are chatBot named GrzybekAIbot. Use Polish language. Nie używaj frazy 'Na podstawie wcześniejszych informacji' oraz 'z opisu kótry podałeś';",
          },
          ...historyMessages,
          { role: "user", content: inputText },
        ],
        temperature: 0.3,
      });
      return await completion.choices[0].message;
    } catch (error) {
      console.error("OpenAI response error: ", error);
      throw error;
    }
  }
};
