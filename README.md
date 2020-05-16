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

## Results

I've used this script to migrate my own music library of ~2,000 tracks of mostly Drum & Bass and some semi-popular electronic music found on YouTube channels such as MrSuicideSheep. To give you an idea of the practical use of this script, I've summarized my own results. Of course, Your Mileage May Vary.

Total tracks: 2,007
Succesfully migrated: 1,469
Found manually: 280
Not available: 258

Considering only tracks that are available on Spotify, that gives a success rate of `1,469 / (1,469 + 280) = 84%`. So far I've found no false positives. Since this test, I've worked on the algorithm a bit more, so I would expect it to do slightly better on the same dataset.

### Analysis

While manually searching for the remaining tracks, I found a number of reasons why tracks were not found by the automated script. Some could perhaps be found with a bit more programming effort, while others were hard to find, even by hand. The reasons include:

- Originally, I discarded everything in the artist name followed by `&`. While this created a simpler search query, it caused quite a few false negatives (this has been improved since).
- My filtering algorithm was sensitive to casing. So while Spotify sometimes found the right track, my algorithm thought it was a different track and discarded it (the filtering is now case-insensitive).
- Some tracks were no longer available on Spotify, though they once were.
- Some artists had changed their name since adding them to my local library. Sometimes, another Spotify user had made playlist with the old artist name, wich helped me to find some of their tracks.
- Sometimes an artist had claimed a remix as their own track, so searching for the original artist failed.
- Some tracks had different spelling or additions such as "Original Mix", which I didn't always manage to filter out.
- Rarely, but sometimes, Spotify search just fails to find tracks that exist.
- Of course, some tracks are simply not available on Spotify.

For the most part, I'm happy with the results.

## Known limitations

- Searching tracks is pretty slow. This is because we have to search for each track one-by-one. It seems like Spotify tends to prevent a connection when you are making requests too fast (even without sending `429 Too Many Requests` responses). To avoid this, I added a delay between each request. You may be able to reduce this by changing the `delay` parameter default value in `src/api.ts`. I've found 500ms to be safe when migrating ~2,000 tracks.
- It might not find everything, depending on the way you name your music files. I recommend looking at the failed results and searching for those files manually. If you're migrating a lot, make sure your terminal has enough scrollback 😄.
- Spotify has a limit of 10,000 tracks in your library, so if you have more than that, you're out of luck.
