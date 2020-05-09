import SpotifyWebApi from "spotify-web-api-node";

async function wrapper(api: SpotifyWebApi) {
  try {
    await migrate(api);
  } catch (e) {
    console.error(`An error occured: ${e.message}`);
    console.trace();
    process.exit(1);
  }
}

async function migrate(api: SpotifyWebApi) {
  const artist = await api.getArtist("6r54QO0889i9vqaeuruUSn");
  console.log(artist.body.name);
}

export { wrapper as migrate };
