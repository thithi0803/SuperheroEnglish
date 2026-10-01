function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeQuestionText(question: string, options: string[], correctIndex: number): string {
  const answer = options[correctIndex]?.trim();
  if (!answer) return question;

  const answerPattern = escapeRegExp(answer);
  const adjectiveBeforeNoun = new RegExp(`\\b(the|a|an)\\s+${answerPattern}(\\s+[a-z]+\\b)`, 'i');
  return question.replace(adjectiveBeforeNoun, '$1$2');
}
