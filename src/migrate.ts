import path from "path";
import compareStrings from "damerau-levenshtein";
import glob from "fast-glob";
import mime from "mime";
import * as musicMetadata from "music-metadata";
import { prompt } from "inquirer";
import ora from "ora";
import SpotifyWebApi from "spotify-web-api-node";

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

  // TODO add files to library

  console.info("✅ Done");
  process.exit(0);
}

async function getLocalFiles(dirPath?: string): Promise<string[]> {
  if (dirPath === undefined) {
    throw new Error("No local directory specified");
  }

  const spinner = ora("Reading local files").start();
  const allFiles = await glob("**/*", {
    cwd: path.resolve(dirPath),
    ignore: process.env.IGNORE_GLOB ? [process.env.IGNORE_GLOB] : [],
  });

  let audioFiles: string[] = [];
  for (const filePath of allFiles) {
    spinner.text = `Reading ${audioFiles.length} local files`;

    // Include only audio files
    const mimeType = mime.getType(filePath);
    if (!mimeType || !mimeType.startsWith("audio/")) {
      continue;
    }

    // Try to get metadata
    let metaData: musicMetadata.IAudioMetadata;
    try {
      metaData = await musicMetadata.parseFile(filePath);
    } catch (e) {
      // Fall back to file name
      const { name } = path.parse(filePath);
      audioFiles.push(name); // basename without extension
      continue;
    }
    const { artist, title } = metaData.common;
    if (!artist || !title) {
      // Fall back to file name
      const { name } = path.parse(filePath);
      audioFiles.push(name); // basename without extension
      continue;
    }
    audioFiles.push(`${artist} - ${title}`);
  }

  spinner.succeed(`Read ${audioFiles.length} local files`);
  return audioFiles;
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
