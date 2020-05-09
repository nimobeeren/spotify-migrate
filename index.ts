import dotenv from "dotenv";
import express from "express";
import SpotifyWebApi from "spotify-web-api-node";

dotenv.config();

const port = process.env.PORT || 8000;
const scopes = ["user-read-private"];
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
// URI must be whitelisted in Spotify API settings
const redirectUri = `http://localhost:${port}/callback`;

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
  const { body } = await api.authorizationCodeGrant(code);
  api.setAccessToken(body["access_token"]);
  api.setRefreshToken(body["refresh_token"]);
  doStuff();
  res.sendStatus(200);
});
app.listen(port);

console.log(`🙋 Log in here:\n${api.createAuthorizeURL(scopes, "whatever")}`);

async function doStuff() {
  console.log("doing api stuff");
}
