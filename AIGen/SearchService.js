const TavilyService = require("./TavilyService");

class SearchService {
  constructor(tavilyApiKey) {
    this.tavilyService = new TavilyService(tavilyApiKey);
    this.searchTriggers = [
      "wyszukaj",
      "znajdź",
      "sprawdź",
      "poszukaj",
      "co wiesz o",
      "informacje o",
      "aktualne dane",
    ];
  }

  containsSearchTrigger(text) {
    return this.searchTriggers.some((trigger) =>
      text.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  async performSearch(query) {
    try {
      const results = await this.tavilyService.search(query);
      return this._formatSearchResults(results);
    } catch (error) {
      console.error("Błąd podczas wyszukiwania:", error);
      throw error;
    }
  }

  _formatSearchResults(results) {
    return results.map((result) => ({
      title: result.title,
      content: result.content,
      url: result.url,
      score: result.score,
    }));
  }

  prepareSearchSummaryPrompt(query, results) {
    return (
      `Na podstawie następujących wyników wyszukiwania, przygotuj zwięzłe i rzeczowe podsumowanie dla zapytania: "${query}"\n\n` +
      results
        .map((result) => `Źródło: ${result.title}\n${result.content}\n`)
        .join("\n")
    );
  }
}

module.exports = SearchService;
