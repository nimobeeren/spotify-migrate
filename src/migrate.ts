import path from "path";
import mime from "mime";
import SpotifyWebApi from "spotify-web-api-node";
import walk from "walkdir";

export async function migrate(api: SpotifyWebApi) {
  const localFiles = await getLocalFiles(process.env.LOCAL_DIR);

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

async function getLocalFiles(dirPath: string): Promise<string[]> {
  const result = await walk.async(path.resolve(dirPath), {
    follow_symlinks: true,
  });
  return result
    .filter((filePath) => {
      const mimeType = mime.getType(filePath);
      return mimeType && mimeType.startsWith("audio/");
    })
    .map((filePath) => {
      const { name } = path.parse(filePath);
      return name; // basename without extension
    });
}
