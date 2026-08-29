const SPOTIFY_TRACK_ID = "[A-Za-z0-9]{22}";
const SPOTIFY_TRACK_URL_RE = new RegExp(
    `^https://open\\.spotify\\.com/(?:intl-[a-z]{2}/)?track/${SPOTIFY_TRACK_ID}(?:[?/].*)?$`,
    "i"
);
const SPOTIFY_TRACK_URI_RE = new RegExp(`^spotify:track:${SPOTIFY_TRACK_ID}$`);
const SPOTIFY_TRACK_ID_RE = new RegExp(`^${SPOTIFY_TRACK_ID}$`);

export function isValidSpotifyTrack(value) {
    if (!value) return true;
    const trimmed = String(value).trim();
    return (
        SPOTIFY_TRACK_ID_RE.test(trimmed) ||
        SPOTIFY_TRACK_URI_RE.test(trimmed) ||
        SPOTIFY_TRACK_URL_RE.test(trimmed)
    );
}

export function spotifyTrackId(value) {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (SPOTIFY_TRACK_ID_RE.test(trimmed)) return trimmed;
    if (SPOTIFY_TRACK_URI_RE.test(trimmed)) {
        return trimmed.slice("spotify:track:".length);
    }
    if (SPOTIFY_TRACK_URL_RE.test(trimmed)) {
        const pathname = new URL(trimmed).pathname;
        return pathname.split("/track/")[1].split("/")[0];
    }
    return trimmed;
}
