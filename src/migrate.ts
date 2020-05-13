import path from "path";
import glob from "fast-glob";
import { prompt } from "inquirer";
import _ from "lodash";
import mime from "mime";
import * as musicMetadata from "music-metadata";
import ora from "ora";
import CustomSpotifyWebApi from "./api";
import { isCorrectTrack, getSearchQuery } from "./util";

interface State {
  localFiles: string[];
  notAvailable: string[];
  alreadyExists: string[];
  ready: SpotifyApi.TrackObjectFull[];
  done: SpotifyApi.TrackObjectFull[];
}

export async function migrate(api: CustomSpotifyWebApi) {
  const state: State = {
    localFiles: [],
    notAvailable: [],
    alreadyExists: [],
    ready: [],
    done: [],
  };

  const localFiles = await getLocalFiles(process.env.LOCAL_DIR);
  state.localFiles = localFiles;

  let spinner = ora().start();
  for (let i = 0; i < 100; i++) {
    spinner.text = `Searching for ${i} of ${localFiles.length} tracks`;

    const searchQuery = getSearchQuery(localFiles[i]);
    const searchResult = await api.safeRequest(() =>
      api.searchTracks(searchQuery)
    );
    const track = searchResult.body.tracks?.items[0];
    const displayName = `${track?.artists[0].name} - ${track?.name}`;

    if (!track || !isCorrectTrack(displayName, searchQuery)) {
      state.notAvailable.push(searchQuery);
      continue;
    }

    const containsResult = await api.safeRequest(() =>
      api.containsMySavedTracks([track.id])
    );
    if (containsResult.body[0]) {
      state.alreadyExists.push(displayName);
      continue;
    }

    state.ready.push(track);
  }
  spinner.succeed(`Searched for ${localFiles.length} tracks`);

  await reportBeforeMigration(state);

  const { cont } = await prompt({
    name: "cont",
    type: "confirm",
    message: "Continue?",
    default: false,
  });

  if (!cont) {
    console.info("❌ Aborted");
    process.exit(0);
  }

  spinner = ora(`Migrating 0 of ${state.ready.length} tracks`).start();
  const trackChunks = _.chunk(state.ready, 50); // 50 tracks per request
  for (const trackChunk of trackChunks) {
    await api.safeRequest(() =>
      api.addToMySavedTracks(trackChunk.map((track) => track.id))
    );
    state.done.push(...trackChunk);
    spinner.text = `Migrating ${state.done.length} of ${state.ready.length} tracks`;
  }

  spinner.succeed(`Migrated ${state.done.length} tracks`);
  // TODO: report

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
    absolute: true,
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

async function reportBeforeMigration(state: State) {
  if (state.notAvailable.length > 0) {
    console.info(`❌ ${state.notAvailable.length} tracks not available`);
  }
  if (state.alreadyExists.length > 0) {
    console.info(`⏭ ${state.alreadyExists.length} tracks already exist`);
  }
  if (state.ready.length > 0) {
    console.info(`🔜 ${state.ready.length} tracks ready to be migrated`);
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
    if (state.ready.length > 0) {
      console.info("🔜 Tracks ready to be migrated:");
      for (const track of state.ready) {
        console.info(`* ${track.artists[0].name} - ${track.name}`);
      }
    }
  }
}
