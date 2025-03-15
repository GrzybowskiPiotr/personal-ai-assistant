const OpenAI = require("openai");
const { MODELS, TOKENS } = require("../../config/constants");
const { encoding_for_model } = require("@dqbd/tiktoken");
const tokenUsageOptimization = require("../../utils/openai/tokenUsageOptimization");
const fs = require("fs");
const imageGenerationPrompt = require("./prompts/imageGenerationPrompt");
const aiAbilitiesPrompt = require("./prompts/aiAbilitiesPrompt");
const initialDescryptionPropmpt = require("./prompts/initialDescryptionPropmpt");

class OpenAIService {
  constructor(apiKey, webSearchService) {
    if (!apiKey) {
      throw new Error("Missing OpenAI API Key");
    }

    this.openai = new OpenAI({ apiKey });
    this.webSearchService = webSearchService;
    if (!webSearchService) {
      throw new Error("Missing Web Search Service");
    }
    // this.functionCallConfig = [
    //   {
    //     type: "function",
    //     function: {
    //       name: "search_web",
    //       description:
    //         "Search for the latest information based on user queries",
    //       parameters: {
    //         type: "object",
    //         properties: {
    //           query: {
    //             type: "string",
    //             description: "Zapytanie wyszukiwania, które ma zostać wykonane",
    //           },
    //         },
    //         required: ["query"],
    //         additionalProperties: false,
    //       },
    //     },
    //   },
    // ];
    this.functionCallConfig = [
      {
        type: "function",
        function: {
          name: "search_web",
          description:
            "When the model does not have current data, such as the latest andorid release, it triggers the search_web function with the user's query as an argument.",
          strict: true,
          parameters: {
            type: "object",
            required: ["user_query"],
            properties: {
              user_query: {
                type: "string",
                description: "The search query provided by the user",
              },
            },
            additionalProperties: false,
          },
        },
      },
    ];
  }

  async search_web(query) {
    const { user_query } = query;
    try {
      const webResponse = await this.webSearchService.search(user_query);
      const answer = webResponse.results.answer;
      const responses = webResponse.results.results;
      return {
        answer,
        responses,
      };
    } catch (error) {
      console.error(
        "Wystąpił błąd wyszukiwania w sieci web przez Tavily:" + error
      );
    }
  }

  async processText(text, history) {
    console.log("text processing!");

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

    // return await this.openai.chat.completions.create({
    const response = await this.openai.chat.completions.create({
      model: MODELS.OPENAI.CHAT,
      messages: [
        {
          role: "system",
          content: `${initialDescryptionPropmpt}${imageGenerationPrompt} ${aiAbilitiesPrompt}`,
        },
        ...optimizedHistory,
        { role: "user", content: text },
      ],
      tools: this.functionCallConfig,
    });

    const assistantMessage = response.choices[0].message;

    // Jeśli OpenAI sugeruje wywołanie funkcji
    if (assistantMessage.tool_calls) {
      console.log("Wywołanie funkcji");
      try {
        const calledFunctionName = assistantMessage.tool_calls[0].function.name;
        const args = JSON.parse(
          assistantMessage.tool_calls[0].function.arguments
        );
        if (calledFunctionName === "search_web") {
          const search_Web_Response = await this.search_web(args);

          //Tu skończyłem dalej do zrobienia jest prezkazanie odpowiedzi do AI

          console.log(search_Web_Response);
        } else {
          throw new Error(`Wywołanie nieznanej funkcji ${calledFunctionName}`);
        }
      } catch (error) {
        console.error("AI wywołało nieznaną funkcję :" + error);
      }

      return null;
    }

    return response;
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
