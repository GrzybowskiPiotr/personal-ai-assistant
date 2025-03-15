const axios = require("axios");

class TavilyService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.tavily.com/v1";
  }

  async search(query, options = { search_depth: "advanced" }) {
    try {
      const response = await axios.post(`${this.baseUrl}/search`, {
        api_key: this.apiKey,
        query: query,
        ...options,
      });

      return {
        success: true,
        results: response.data.results,
        topic: response.data.topic,
      };
    } catch (error) {
      console.error("Błąd podczas wyszukiwania w Tavily:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async searchWithKeywords(text, keywords) {
    // Sprawdź, czy tekst zawiera słowa kluczowe
    const hasKeywords = keywords.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeywords) {
      return await this.search(text);
    }

    return null;
  }
}

module.exports = TavilyService;
