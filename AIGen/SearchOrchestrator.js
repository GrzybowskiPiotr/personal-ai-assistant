const SEARCH_KEYWORDS = [
  "wyszukaj",
  "znajdź",
  "sprawdź",
  "poszukaj",
  "aktualne",
  "najnowsze",
  "bieżące",
  "dzisiejsze",
  "search",
  "find",
  "look up",
  "current",
  "latest",
];

class SearchOrchestrator {
  constructor(tavilyService, openAIService) {
    this.tavilyService = tavilyService;
    this.openAIService = openAIService;
  }

  async processQuery(query) {
    try {
      // 1. Najpierw sprawdź słowa kluczowe
      const searchResults = await this.tavilyService.searchWithKeywords(
        query,
        SEARCH_KEYWORDS
      );

      if (searchResults?.success) {
        // Jeśli znaleziono wyniki, przekaż je do OpenAI do podsumowania
        return await this.openAIService.summarizeSearchResults(
          searchResults.results,
          query
        );
      }

      // 2. Jeśli nie ma słów kluczowych, przekaż zapytanie do OpenAI
      const openAIResponse = await this.openAIService.processText(query, []);

      // 3. Jeśli OpenAI zgłosi brak aktualnych danych, wykonaj wyszukiwanie
      if (this._needsSearchUpdate(openAIResponse)) {
        const fallbackResults = await this.tavilyService.search(query);
        if (fallbackResults.success) {
          return await this.openAIService.summarizeSearchResults(
            fallbackResults.results,
            query
          );
        }
      }

      return openAIResponse;
    } catch (error) {
      console.error("Błąd w SearchOrchestrator:", error);
      throw error;
    }
  }

  _needsSearchUpdate(openAIResponse) {
    // Sprawdź, czy odpowiedź OpenAI sugeruje potrzebę aktualizacji danych
    const content =
      openAIResponse?.choices?.[0]?.message?.content?.toLowerCase() || "";
    return (
      content.includes("nie mam aktualnych danych") ||
      content.includes("nie posiadam aktualnych informacji") ||
      content.includes("moje dane mogą być nieaktualne")
    );
  }
}

module.exports = SearchOrchestrator;
