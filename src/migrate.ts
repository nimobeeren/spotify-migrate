import path from "path";
import compareStrings from "damerau-levenshtein";
import mime from "mime";
import * as musicMetadata from "music-metadata";
import { prompt } from "inquirer";
import ora from "ora";
import SpotifyWebApi from "spotify-web-api-node";
import walk from "walkdir";

interface State {
  notAvailable: string[];
  alreadyExists: string[];
  waiting: Track[];
  done: Track[];
}

interface Track {
  id: string;
  artists: Array<{
    name: string;
  }>;
  name: string;
}

export async function migrate(api: SpotifyWebApi) {
  const localFiles = await getLocalFiles(process.env.LOCAL_DIR);

  const state: State = {
    notAvailable: [],
    alreadyExists: [],
    waiting: [],
    done: [],
  };

  for (const localFile of localFiles) {
    const result = await api.searchTracks(localFile);
    const track = result.body.tracks?.items[0];
    const displayName = `${track?.artists[0].name} - ${track?.name}`;

    if (!track || !isCorrectTrack(displayName, localFile)) {
      state.notAvailable.push(localFile);
      continue;
    }

    const exists = (await api.containsMySavedTracks([track.id])).body[0];
    if (exists) {
      state.alreadyExists.push(displayName);
      continue;
    }

    state.waiting.push(track);
  }

  await reportBeforeMigration(state);

  console.info("✅ Done");
  process.exit(0);
}

async function getLocalFiles(dirPath?: string): Promise<string[]> {
  if (dirPath === undefined) {
    throw new Error("No local directory specified");
  }
  const spinner = ora("Reading local files").start();
  const result = await walk.async(path.resolve(dirPath), {
    follow_symlinks: true,
  });
  const files = await Promise.all(
    result
      .filter((filePath, index) => {
        if (index > 100) return false; // TODO
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
  spinner.succeed();
  return files;
}

function isCorrectTrack(candidate: string, target: string): boolean {
  const threshold = 0.9;
  const { similarity } = compareStrings(candidate, target) || {};
  return similarity && similarity > threshold;
}

async function reportBeforeMigration(state: State) {
  if (state.notAvailable.length > 0) {
    console.info(`❌ ${state.notAvailable.length} tracks not available`);
  }
  if (state.alreadyExists.length > 0) {
    console.info(`⏩ ${state.alreadyExists.length} tracks already exist`);
  }
  if (state.waiting.length > 0) {
    console.info(`🔜 ${state.waiting.length} tracks ready to be migrated`);
  } else {
    console.info(`🔚 no tracks left to be migrated`);
  }

  const { showList } = await prompt({
    name: "showList",
    type: "confirm",
    message: "List files before migrating?",
    default: false,
  });
  if (showList) {
    if (state.notAvailable.length > 0) {
      console.info("❌ Unavailable tracks:");
      for (const trackName of state.notAvailable) {
        console.info(`* ${trackName}`);
      }
    }
    if (state.alreadyExists.length > 0) {
      console.info("⏭ Already existing tracks:");
      for (const trackName of state.alreadyExists) {
        console.info(`* ${trackName}`);
      }
    }
    if (state.waiting.length > 0) {
      console.info("🔜 Tracks ready to be migrated:");
      for (const track of state.waiting) {
        console.info(`* ${track.artists[0].name} - ${track.name}`);
      }
    }
  }
}
