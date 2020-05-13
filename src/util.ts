import compareStrings from "damerau-levenshtein";
import wait from "waait";

export async function safeRequest<T extends (...args: any) => Promise<any>>(
  requestFunc: T,
  delay = 500,
  retries = 3
): Promise<ReturnType<T>> {
  await wait(delay);
  try {
    return await requestFunc();
  } catch (e) {
    if (retries > 0) {
      return await safeRequest(requestFunc, delay * 2, retries - 1);
    }
    throw e;
  }
}

export function isCorrectTrack(candidate: string, target: string): boolean {
  const threshold = 0.8;

  let result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  target = target.replace(/\((feat|ft).*\)/i, "").trim();
  result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  candidate = candidate.replace(/- \w+ mix/i, "").trim();
  result = compareStrings(candidate, target) || {};
  if (result?.similarity > threshold) {
    return true;
  }

  return false;
}
