# Spotify Migrate

## Description

It's a script that migrates your local music files to Spotify. My main motivations for making this (as opposed to simply adding the local files to Spotify):

- Spotify has better audio quality than most files I have
- Spotify has more consistent naming of tracks/artists

It works by reading metadata (falling back to filenames) of your local music files, searching for them on Spotify and adding them to your liked songs.

## Usage

1. Clone or download the repo
2. `yarn install`
3. Configure your `.env` file (see [Configuration](#configuration))
4. `yarn start`
5. The first time you run the script, you will be asked to log in to Spotify. You'll only need to do this once.

## Configuration

To use this script, you'll need to register an application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Once done, go into the settings and look for "Redirect URIs". You'll need to add `http://localhost:8000/callback` to that list.

Currently, all configuration is done through environment variables. The easiest way to get started is to make a copy of the provided `.env.example` file and call it `.env`. Then you'll need to change the values as follows.

### Required configuration

`CLIENT_ID`: Client ID for Spotify API (**required**)

You can find this on your Spotify API application page.

`CLIENT_SECRET`: Client secret for Spotify API (**required**)

You can find this on your Spotify API application page.

`LOCAL_DIR`: Path to the music directory on your local PC (**required**)

Examples: `"/home/myname/Music"` or `"C:\Users\MyName\Music"`

### Optional configuration

`IGNORE_GLOB`: Pattern to ignore local files (using [glob](<https://en.wikipedia.org/wiki/Glob_(programming)>))

Examples: `"*.flac"` or `"Guilty pleasures/**/*"`

## Known limitations

- Searching tracks is pretty slow. This is because we have to search for each track one-by-one. It seems like Spotify tends to prevent a connection when you are making requests too fast (even without sending `429 Too Many Requests` responses). To avoid this, I added a delay between each request. You may be able to reduce this by changing the `delay` parameter default value in `src/api.ts`. I've found 500ms to be safe when migrating ~2,000 tracks.
- It might not find everything, depending on the way you name your music files. I recommend looking at the failed results and searching for those files manually. If you're migrating a lot, make sure your terminal has enough scrollback 😄.
- Spotify has a limit of 10,000 tracks in your library, so if you have more than that, you're out of luck.
