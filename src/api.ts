import SpotifyWebApi from "spotify-web-api-node";
import wait from "waait";

export default class CustomSpotifyWebApi extends SpotifyWebApi {
  async safeRequest<T extends (...args: any) => Promise<any>>(
    requestFunc: T,
    delay = 500,
    retries = 3
  ): Promise<ReturnType<T>> {
    await wait(delay);
    try {
      return await requestFunc();
    } catch (e) {
      if (retries > 0) {
        return await this.safeRequest(requestFunc, delay * 2, retries - 1);
      }
      throw e;
    }
  }
}
