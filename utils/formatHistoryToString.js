module.exports = function formatHistoryToString(history) {
  let formatedHistory = history
    .map((item) => `${item.role} : ${item.content}`)
    .join();
  return formatedHistory;
};
