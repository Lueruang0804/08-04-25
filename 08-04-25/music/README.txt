Background music is now sourced from YouTube instead of a local file.

To change the song, edit CONFIG.youtubeVideoId in script.js — it's the
part of a YouTube link after "youtu.be/" (or after "v=" in a full
youtube.com URL), before any "?" query string.

Example: https://youtu.be/hkLVI3DoeAE?si=... -> video ID is hkLVI3DoeAE

The video plays hidden (audio only) via YouTube's official embed
player, controlled by the floating music button's play/pause and
volume controls.
