import dotenv from "dotenv";
import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { LocalStorage } from "node-localstorage";

dotenv.config();

const port = process.env.PORT || 8000;
const scopes = ["user-read-private"];
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
// URI must be whitelisted in Spotify API settings
const redirectUri = `http://localhost:${port}/callback`;

const localStorage = new LocalStorage("./credentials");

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
  console.info("Got credentials from callback");
  const { body } = await api.authorizationCodeGrant(code);
  const accessToken = body["access_token"];
  const refreshToken = body["refresh_token"];
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  api.setAccessToken(accessToken);
  api.setRefreshToken(refreshToken);
  doStuff();
  res.sendStatus(200);
});
app.listen(port);

const accessToken = localStorage.getItem("access_token");
const refreshToken = localStorage.getItem("refresh_token");
if (accessToken && refreshToken) {
  console.info("Got credentials from local storage");
  api.setAccessToken(accessToken);
  api.setRefreshToken(refreshToken);
  doStuff();
} else {
  console.log(`🙋 Log in here:\n${api.createAuthorizeURL(scopes, "whatever")}`);
}

async function doStuff() {
  console.log("doing api stuff");
}
