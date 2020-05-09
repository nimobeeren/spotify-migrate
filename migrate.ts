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
  const localFiles = ["Metrik - Freefall VIP"];

  for (const localFile of localFiles) {
    const result = await api.searchTracks(localFile);
    const track = result.body.tracks?.items[0];
    const displayName = `${track.artists[0].name} - ${track.name}`;
    console.log(`Found: ${displayName}`);

    const exists = (await api.containsMySavedTracks([track.id])).body[0];
    if (exists) {
      console.log(`Already exists: ${displayName}`);
      continue;
    }

    await api.addToMySavedTracks([track.id]);
    console.log(`Added: ${displayName}`);
  }

  console.log("✅ Done");
  process.exit(0);
}

export { wrapper as migrate };
