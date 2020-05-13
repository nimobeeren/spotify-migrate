import compareStrings from "damerau-levenshtein";

export function isCorrectTrack(candidate: string, target: string): boolean {
  const threshold = 0.8;

  let result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  candidate = candidate.replace(/- \w+ mix/i, "").trim();
  result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  candidate = candidate.replace(/(ft|feat)[^-\(\)]+/i, "").trim();
  candidate = candidate.replace("()", "").trim();
  result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  return false;
}

export function getSearchQuery(origQuery: string) {
  let query = origQuery.replace(/(ft|feat)[^-\(\)]+/i, "");
  query = query.replace("()", "");
  query = query.replace(/\((.+)\)/, "- $1");
  query = query.replace(/&.*?-/, "-");
  return query.trim();
}
