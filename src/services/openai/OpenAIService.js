const OpenAI = require("openai");
const { MODELS, TOKENS } = require("../../config/constants");
const { encoding_for_model } = require("@dqbd/tiktoken");
const tokenUsageOptimization = require("../../utils/openai/tokenUsageOptimization");
const fs = require("fs");

class OpenAIService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("Missing OpenAI API Key");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async processText(text, history) {
    // Sprawdź, czy to żądanie generowania obrazu
    const imageGenerationTriggers = [
      "narysuj",
      "wygeneruj obraz",
      "stwórz obraz",
      "pokaż",
      "namaluj",
      "draw",
      "generate image",
      "create image",
      "show me",
      "paint",
    ];

    const isImageRequest = imageGenerationTriggers.some((trigger) =>
      text.toLowerCase().includes(trigger.toLowerCase())
    );

    if (isImageRequest) {
      try {
        const imageUrl = await this.generateImage(text);
        return {
          choices: [
            {
              message: {
                content: {
                  image: imageUrl,
                  text: "Wygenerowałem obraz zgodnie z Twoim opisem.",
                },
              },
            },
          ],
        };
      } catch (error) {
        console.error("Błąd generowania obrazu:", error);
        // Jeśli generowanie obrazu się nie powiedzie, kontynuuj jako normalną rozmowę
      }
    }

    // Standardowa obsługa tekstu
    const tokenizer = encoding_for_model(MODELS.OPENAI.CHAT);
    const optimizedHistory = tokenUsageOptimization(
      history,
      text,
      TOKENS.MAX_TOKENS_IN_REQUEST,
      tokenizer
    );
    tokenizer.free();

    return await this.openai.chat.completions.create({
      model: MODELS.OPENAI.CHAT,
      messages: [
        {
          role: "system",
          content: `You are chatBot named Grzybek_AI_bot. 
        Use Polish language. 
        Nie używaj frazy 'Na podstawie wcześniejszych informacji' oraz 'z opisu, który podałeś'.
        Odpowiadaj zawsze wyłącznie po polsku, niezależnie od języka zapytania użytkownika. ${imageGenerationPrompt} ${aiAbilitiesPrompt}`,
        },
        ...optimizedHistory,
        { role: "user", content: text },
      ],
    });
  }

  async processImage(imageUrl, prompt) {
    return await this.openai.chat.completions.create({
      model: MODELS.OPENAI.CHAT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 500,
    });
  }

  async generateImage(
    description,
    quantity = 1,
    quality = "standard",
    size = "1024x1024"
  ) {
    // Przygotuj prompt do generowania obrazu
    const prompt = this._prepareImagePrompt(description);

    const response = await this.openai.images.generate({
      model: MODELS.OPENAI.IMAGE,
      prompt: prompt,
      n: quantity,
      quality,
      size,
    });
    return response.data[0].url;
  }

  _prepareImagePrompt(description) {
    // Usuń słowa kluczowe związane z generowaniem obrazu
    const cleanDescription = description
      .toLowerCase()
      .replace(
        /narysuj|wygeneruj obraz|stwórz obraz|pokaż|namaluj|draw|generate image|create image|show me|paint/gi,
        ""
      )
      .trim();

    // Dodaj dodatkowe instrukcje dla lepszej jakości
    return `High quality, detailed image of ${cleanDescription}. Photorealistic, 4K, detailed, sharp focus.`;
  }

  async transcribeAudio(audioPath) {
    const audioFile = fs.createReadStream(audioPath);
    return await this.openai.audio.transcriptions.create({
      model: MODELS.OPENAI.AUDIO,
      file: audioFile,
    });
  }
}

module.exports = OpenAIService;
