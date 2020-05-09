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

const localStorage = new LocalStorage("../credentials");

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

if (getTokenFromLocalStorage()) {
  start();
} else {
  const authUrl = api.createAuthorizeURL(scopes, "whatever");
  console.info(`🙋 Please allow this app to access your account:\n${authUrl}`);
}

async function getTokenFromCode(code: string) {
  const { body } = await api.authorizationCodeGrant(code);
  const { access_token, refresh_token } = body;
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  api.setAccessToken(access_token);
  api.setRefreshToken(refresh_token);
}

function getTokenFromLocalStorage(): boolean {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (accessToken && refreshToken) {
    console.info("🆗 Got credentials from local storage");
    api.setAccessToken(accessToken);
    api.setRefreshToken(refreshToken);
    return true;
  }

  return false;
}

async function start() {
  try {
    await migrate(api);
  } catch (e) {
    if (e.statusCode === 401) {
      // Got "Unauthorized" response, access token has probably expired
      const { body } = await api.refreshAccessToken();
      const { access_token } = body;
      localStorage.setItem("access_token", access_token);
      api.setAccessToken(access_token);
      console.info("💧 Refreshed access token");
      start(); // restart
    } else {
      console.error(`\n🚨 An error occured: ${e.message}`);
      console.error(e.stack);
      process.exit(1);
    }
  }
}
