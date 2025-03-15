class TavilyService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.tavily.com/v1";
  }

  async search(query, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          query,
          search_depth: options.searchDepth || "advanced",
          include_domains: options.includeDomains || [],
          exclude_domains: options.excludeDomains || [],
          max_results: options.maxResults || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error("Błąd podczas wyszukiwania Tavily:", error);
      throw error;
    }
  }
}

module.exports = TavilyService;
