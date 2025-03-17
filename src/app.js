const { connectToDB } = require("./db/connection");
const TelegramBot = require("./services/telegram/bot");
const OpenAIService = require("./services/openai/OpenAIService");
const tavilyService = require("./services/tavily/TavilyService");
const app = require("./app.js");
// Walidacja kluczy API
const botApiKey = process.env.TELEGRAM_BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!botApiKey || !openaiKey) {
  console.error("Brak wymaganych kluczy API w pliku .env");
  process.exit(1);
}

// Inicjalizacja serwisów
const webSearchService = new tavilyService(tavilyApiKey);
const openAIService = new OpenAIService(openaiKey, webSearchService);

const PORT = process.env.PORT || 3000;

async function startApplication() {
  try {
    // Połączenie z bazą danych
    await connectToDB();

    // Inicjalizacja i uruchomienie bota
    const bot = new TelegramBot(botApiKey, openAIService, webSearchService);
    await bot.start();

    console.log(`Aplikacja została uruchomiona pomyślnie na porcie ${PORT}!`);
  } catch (error) {
    console.error("Błąd podczas uruchamiania aplikacji:", error);
    process.exit(1);
  }
}

startApplication();
app.listen(PORT, () => {
  console.log(`serwer nasłuchuje na porcie ${PORT}`);
});
