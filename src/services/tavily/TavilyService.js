const axios = require("axios");

module.exports = class TavilyService {
  constructor(tavilyApiKey) {
    if (!tavilyApiKey) {
      console.error("Brak wymaganych kluczy API: Tavily w pliku .env");
      process.exit(1);
    }
    this.tavilyApiKey = tavilyApiKey;
    this.baseUrl = "https://api.tavily.com";
  }

  async search(query) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/search`,
        {
          query: query,
          topic: "general",
          search_depth: "basic",
          max_results: 4,
          time_range: null,
          days: 3,
          include_answer: true,
          include_raw_content: false,
          include_images: false,
          include_image_descriptions: false,
          include_domains: [],
          exclude_domains: [],
        },
        {
          headers: {
            Authorization: `Bearer ${this.tavilyApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        results: response.data,
      };
    } catch (error) {
      console.error("Błąd pobierania wyników wyszukiwania w Tavily: ", error);
      return { success: false, error: error.message };
    }
  }
};
