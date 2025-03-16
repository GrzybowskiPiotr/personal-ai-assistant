function formatWebSearchResponse(response) {
  try {
    if (
      typeof response === "object" &&
      typeof response.answer === "string" &&
      typeof response.responses === "object"
    ) {
      const { answer, responses } = response;
      const higSocereResponses = responses
        .map((res) => {
          if (res.score > 0.65) {
            return `content: ${res.content}, url: ${res.url}`;
          }
        })
        .filter((res) => res != undefined);
      const formattedString = `Odpowiedź główna: ${answer} żródła: ${higSocereResponses.join()}`;
      return formattedString;
    }
  } catch (error) {
    console.error("Błędny format odpowiedzi z usługi web_Search: " + error);
  }
}

module.exports = formatWebSearchResponse;
