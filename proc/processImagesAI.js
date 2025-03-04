module.exports = async function processImagesAI(
  fileUrl,
  instructions,
  AiInstance,
  AiModel
) {
  try {
    const response = await AiInstance.chat.completions.create({
      model: AiModel,
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
};
