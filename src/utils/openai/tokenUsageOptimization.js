const formatHistoryToString = require("../formatters/formatHistoryToString");

module.exports = function tokenUsageOptimization(
  historyMessages,
  newMessage,
  maxTokens,
  tokenizer
) {
  let historySizeInTokens = tokenizer.encode(
    formatHistoryToString(historyMessages)
  ).length;

  let messageInTokens = tokenizer.encode(newMessage).length;

  while (historySizeInTokens + messageInTokens >= maxTokens) {
    historyMessages.splice(0, 1);
    historySizeInTokens = tokenizer.encode(
      formatHistoryToString(historyMessages)
    ).length;
  }
  return historyMessages;
};
