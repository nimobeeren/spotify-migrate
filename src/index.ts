import dotenv from "dotenv";
import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { LocalStorage } from "node-localstorage";
import { migrate } from "./migrate";

dotenv.config();

const port = process.env.PORT || 8000;
const scopes = ["user-library-read", "user-library-modify"];
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
// URI must be whitelisted in Spotify API settings
const redirectUri = `http://localhost:${port}/callback`;

const localStorage = new LocalStorage("../credentials2");

const api = new SpotifyWebApi({
  clientId,
  clientSecret,
  redirectUri,
});

const app = express();
app.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    res.status(401).send(`Authorization failed: ${error}`);
    return;
  }
  if (typeof code !== "string") {
    res.status(500).send(`Got invalid code: ${code}`);
    return;
  }
  console.info("🆗 Got authorization code from callback");
  await getTokenFromCode(code);
  start();
  res.sendStatus(200);
});
app.listen(port);

async function getTokenFromCode(code: string) {
  const { body } = await api.authorizationCodeGrant(code);
  const { access_token, refresh_token, expires_in } = body;
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  localStorage.setItem(
    "expires_at",
    (Date.now() + expires_in * 1000).toString()
  );
  api.setAccessToken(access_token);
  api.setRefreshToken(refresh_token);
}

async function getTokenFromLocalStorage(): Promise<boolean> {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");
  const expiresAt = localStorage.getItem("expires_at");

  if (refreshToken) {
    api.setRefreshToken(refreshToken);
  } else {
    return false;
  }

  if (accessToken) {
    api.setAccessToken(accessToken);
    console.info("🆗 Got credentials from local storage");
  }

  if (!accessToken || parseInt(expiresAt || "0", 10) < Date.now()) {
    const { body } = await api.refreshAccessToken();
    const { access_token: newAccessToken, expires_in: expiresIn } = body;
    localStorage.setItem("access_token", newAccessToken);
    localStorage.setItem(
      "expires_at",
      (Date.now() + expiresIn * 1000).toString()
    );
    api.setAccessToken(newAccessToken);
    api.setRefreshToken(refreshToken);
    console.info("💧 Refreshed access token");
  }

  return true;
}

async function start() {
  try {
    await migrate(api);
  } catch (e) {
    console.error(`\n🚨 An error occured: ${e.message}`);
    e.stack && console.error(e.stack);
    process.exit(1);
  }
}

(async function init() {
  const ready: boolean = await getTokenFromLocalStorage();
  if (ready) {
    start();
  } else {
    const authUrl = api.createAuthorizeURL(scopes, "whatever");
    console.info(
      `🙋 Please allow this app to access your account:\n${authUrl}`
    );
  }
})();
