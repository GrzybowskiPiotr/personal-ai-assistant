const OpenAI = require("openai");
const { MODELS, TOKENS } = require("../../config/constants");
const { encoding_for_model } = require("@dqbd/tiktoken");
const tokenUsageOptimization = require("../../utils/openai/tokenUsageOptimization");
const fs = require("fs");
const aiAbilitiesPrompt = require("./prompts/aiAbilitiesPrompt");
const initialDescryptionPropmpt = require("./prompts/initialDescryptionPropmpt");
const formatWebSearchResponse = require("../../utils/formatters/formatWebSearchResponse");
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
      const success = webResponse.success;
      const answer = webResponse.results.answer;
      const responses = webResponse.results.results;

      return { success, answer, responses };
    } catch (error) {
      console.error(
        "Wystąpił błąd wyszukiwania w sieci web przez Tavily:" + error
      );
    }
  }

  async processText(text, history) {
    // Check if this is an image generation request.
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
      }
    }

    // Standard text handling.
    const tokenizer = encoding_for_model(MODELS.OPENAI.CHAT);
    const optimizedHistory = tokenUsageOptimization(
      history,
      text,
      TOKENS.MAX_TOKENS_IN_REQUEST,
      tokenizer
    );
    tokenizer.free();

    const response = await this.openai.chat.completions.create({
      model: MODELS.OPENAI.CHAT,
      messages: [
        {
          role: "system",
          content: `${initialDescryptionPropmpt}${aiAbilitiesPrompt}`,
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
          const formatetResposne = formatWebSearchResponse(search_Web_Response);

          if (formatetResposne.success) {
            return await this.openai.chat.completions.create({
              model: MODELS.OPENAI.CHAT,
              //Providing a formatted response.
              messages: [
                {
                  role: "system",
                  content: `Na podstawie poniższych informacji z przeszukania sieci, przygotuj podsumowanie zawierające najważniejsze informacje. Rozpocznij odpowiedź od frazy: "Musiałem to sprawdzić. Dowiedziałem się, że:". Stosuj zwięzły i klarowny język. Oto dane wejściowe:${formatetResposne.formattedString}.Umieść stopkę oddzieloną od sekcji informacji. W stopce wypowiedzi podaj źródłowy url. Poinformuj urzytkownika, że warto zapoznać się z pełną publikacją.`,
                },
              ],
            });
          } else {
            return await this.openai.chat.completions.create({
              model: MODELS.OPENAI.CHAT,
              //Providing information about the lack of search results on the web.
              messages: [
                {
                  role: "system",
                  content: `Poinformuj urzytkownika w przyjazny sposób, że nie znalezłeś odpowiedzi w sieci oraz nie masz wiedzy na dany temat`,
                },
              ],
            });
          }
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
    // Prepeare a prompt for image generation.
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
    // Remove keywords related to image generation.
    const cleanDescription = description
      .toLowerCase()
      .replace(
        /narysuj|wygeneruj obraz|stwórz obraz|pokaż|namaluj|draw|generate image|create image|show me|paint/gi,
        ""
      )
      .trim();

    // Add additional instructions for better quality.
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
