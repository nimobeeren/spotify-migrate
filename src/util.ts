import wait from "waait";

export async function safeRequest<T extends (...args: any) => Promise<any>>(
  requestFunc: T,
  delay = 500,
  retries = 3
): Promise<ReturnType<T>> {
  await wait(delay);
  try {
    console.log("Safe request");
    return await requestFunc();
  } catch (e) {
    if (retries > 0) {
      "Retrying";
      return await safeRequest(requestFunc, delay * 2, retries - 1);
    }
    throw e;
  }
}
