/*
# Add learning memory to lesson completions

1. Purpose
- Preserve the existing login, sequential unlock flow, score thresholds, and completion history.
- Store the vocabulary learned in each attempt so repeated lessons can generate new words.
- Store vocabulary that the learner answered incorrectly so later lessons can include targeted review.

2. Modified Tables
- `lesson_completions`
  - `learned_words` (text[], not null, defaults to an empty array): the five vocabulary words taught in that attempt.
  - `weak_words` (text[], not null, defaults to an empty array): words the learner missed during that attempt.

3. Data Safety
- Existing rows remain valid because both new columns have empty-array defaults.
- No columns are removed, renamed, or type-changed.

4. Security
- Existing owner-scoped RLS policies remain unchanged.
- The new columns inherit the existing authenticated user's row-level access rules.
*/

ALTER TABLE lesson_completions
  ADD COLUMN IF NOT EXISTS learned_words text[] NOT NULL DEFAULT '{}';

ALTER TABLE lesson_completions
  ADD COLUMN IF NOT EXISTS weak_words text[] NOT NULL DEFAULT '{}';