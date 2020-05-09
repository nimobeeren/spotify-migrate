import path from "path";
import compareStrings from "damerau-levenshtein";
import mime from "mime";
import * as musicMetadata from "music-metadata";
import SpotifyWebApi from "spotify-web-api-node";
import walk from "walkdir";

export async function migrate(api: SpotifyWebApi) {
  const localFiles = await getLocalFiles(process.env.LOCAL_DIR);

  for (const localFile of localFiles.slice(0, 10)) {
    const result = await api.searchTracks(localFile);
    const track = result.body.tracks?.items[0];
    const displayName = `${track?.artists[0].name} - ${track?.name}`;

    if (!track || !isCorrectTrack(displayName, localFile)) {
      console.info(`Not found: ${localFile}`);
      continue;
    }
    console.info(`Found: ${displayName}`);

    const exists = (await api.containsMySavedTracks([track.id])).body[0];
    if (exists) {
      console.info(`Already exists: ${displayName}`);
      continue;
    }

    // await api.addToMySavedTracks([track.id]);
    console.info(`Added: ${displayName}`);
  }

  console.info("✅ Done");
  process.exit(0);
}

async function getLocalFiles(dirPath?: string): Promise<string[]> {
  if (dirPath === undefined) {
    throw new Error("No local directory specified");
  }
  const result = await walk.async(path.resolve(dirPath), {
    follow_symlinks: true,
  });
  return Promise.all(
    result
      .filter((filePath, index) => {
        if (index > 9) return false;
        const mimeType = mime.getType(filePath);
        return mimeType && mimeType.startsWith("audio/");
      })
      .map(async (filePath) => {
        const metaData = await musicMetadata.parseFile(filePath);
        const { artist, title } = metaData.common;
        if (!artist || !title) {
          // Fallback to file name
          const { name } = path.parse(filePath);
          return name; // basename without extension
        }
        return `${artist} - ${title}`;
      })
  );
}

function isCorrectTrack(candidate: string, target: string): boolean {
  const threshold = 0.9;
  const { similarity } = compareStrings(candidate, target) || {};
  return similarity && similarity > threshold;
}
