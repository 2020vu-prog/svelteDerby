import log from "loglevel";
import { get as getStore } from "svelte/store";
import {
    pushMessage,
    spotifyAccessToken,
    spotifyExpiresAt,
    spotifyLoggedIn,
    spotifyPremiumRequired,
    spotifyRefreshToken,
    spotifySelectedDeviceId,
} from "../stores.js";

const SS = "cc79096dfc214db2bf5f51556ba6ef31";
const SID = "6c096d4f69414adab02c33e9ebefab0e";
const clientId = SID;
const spotifyRefreshEarlyMs = 60 * 1000;
let spotifyRefreshPromise;
export const spotifyPremiumRequiredMessage =
    "Spotify Premium required: walk-up playback cannot control Spotify for this logged-in account. Confirm that the account has Spotify Premium and is authorized for this Spotify developer app.";

function showSpotifyPremiumRequired() {
    spotifyPremiumRequired.set(true);
    pushMessage({
        key: "spotify-premium-required",
        text: spotifyPremiumRequiredMessage,
        type: "error",
    });
}

function storeSpotifyTokenResponse(response) {
    spotifyAccessToken.set(response.access_token);
    if (response.refresh_token) {
        spotifyRefreshToken.set(response.refresh_token);
    }
    if (response.expires_in) {
        spotifyExpiresAt.set(Date.now() + Number(response.expires_in) * 1000);
    } else {
        spotifyExpiresAt.set(0);
    }
}

function showSpotifyLoginExpired() {
    logoutSpotify();
    pushMessage({
        key: "spotify-login-expired",
        text: "Spotify login expired; sign in again.",
        type: "error",
    });
}

const generateRandomString = (length) => {
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const ssha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const rc = await window.crypto.subtle.digest("SHA-256", data);
    return rc;
};
const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};

export async function getSpotifyPKCE() {
    //const redirectUri = 'https://0.0.0.0:8080/spotify_callback';
    const url = new URL(window.location.href);

    //const redirectUri = 'https://0.0.0.0:8080';
    const redirectUri = url.origin;
    localStorage.setItem("spotify:redirect", redirectUri);

    //const scope = 'user-read-private user-read-email';
    const scope =
        "user-read-private user-read-email user-read-playback-state user-modify-playback-state";
    const authUrl = new URL("https://accounts.spotify.com/authorize");

    // generated in the previous step
    const codeVerifierRaw = generateRandomString(64);

    const codeVerifierSha256 = await ssha256(codeVerifierRaw);
    const codeVerifierB64 = base64encode(codeVerifierSha256);
    window.localStorage.setItem("spotify:code_verifier", codeVerifierRaw);

    const params = {
        state: "spotify_auth_callback",
        response_type: "code",
        client_id: clientId,
        scope,
        code_challenge_method: "S256",
        code_challenge: codeVerifierB64,
        redirect_uri: redirectUri,
        show_dialog: true,
    };

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
}
export async function getSpotifyAccessToken(code) {
    // stored in the previous step
    const codeVerifier = localStorage.getItem("spotify:code_verifier");
    const redirectUri = localStorage.getItem("spotify:redirect");

    const url = "https://accounts.spotify.com/api/token";
    const payload = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    };

    const body = await fetch(url, payload);
    const response = await body.json();

    if (!body.ok || !response?.access_token) {
        throw new Error(
            `Spotify token exchange failed: ${response?.error_description || response?.error || body.status}`
        );
    }

    storeSpotifyTokenResponse(response);
    spotifySelectedDeviceId.set("");
    spotifyPremiumRequired.set(false);
    spotifyLoggedIn.set(Boolean(getStore(spotifyRefreshToken)));
    await spotifyMe();
}
export function logoutSpotify() {
    spotifyAccessToken.set("");
    spotifyRefreshToken.set("");
    spotifyExpiresAt.set(0);
    localStorage.removeItem("spotify:code_verifier");
    localStorage.removeItem("spotify:redirect");
    spotifySelectedDeviceId.set("");
    spotifyPremiumRequired.set(false);
    spotifyLoggedIn.set(false);
}
export async function urlParseSpotify() {
    const u = new URL(document.URL);

    if (u.searchParams.get("state") === "spotify_auth_callback") {
        const rtoken = u.searchParams.get("code");
        // Spotify authorization codes are single-use. Remove callback
        // parameters synchronously so remounts and BFCache restoration
        // cannot submit the same code again while this request is active.
        window.history.replaceState(
            {},
            document.title,
            `${u.pathname}${u.hash}`
        );
        await getSpotifyAccessToken(rtoken);
    }
}

export async function spotifyListDevices() {
    const url = new URL("https://api.spotify.com/v1/me/player/devices");
    const payload = {
        method: "GET",
        headers: {
            Authorization: `Bearer DEFER`,
        },
    };

    const response = await fetch401retry(url, payload);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(
            body?.error?.message ||
                `Spotify device lookup failed: ${response.status}`
        );
        error.status = response.status;
        throw error;
    }
    spotifyPremiumRequired.set(false);
    const body = await response.json();
    return body;
}

export async function spotifyActiveDeviceId() {
    let body;
    try {
        body = await spotifyListDevices();
    } catch (error) {
        if (error.status === 403) {
            showSpotifyPremiumRequired();
        } else {
            pushMessage({
                key: "spotify-device-lookup-error",
                text: error.message || "Spotify device lookup failed.",
                type: "error",
            });
        }
        return null;
    }
    const activeDevice = body?.devices?.find(
        (device) => device.is_active && !device.is_restricted
    );

    if (!activeDevice) {
        pushMessage({
            key: "spotify-no-active-device",
            text: "Spotify has no active playback device. Start playback on the intended device, then try the walk-up again.",
            type: "error",
        });
        return null;
    }

    return activeDevice.id;
}

export async function spotifySelectableDevices() {
    try {
        const body = await spotifyListDevices();
        return (body?.devices || []).filter((device) => !device.is_restricted);
    } catch (error) {
        if (error.status === 403) {
            showSpotifyPremiumRequired();
        } else {
            pushMessage({
                key: "spotify-device-lookup-error",
                text: error.message || "Spotify device lookup failed.",
                type: "error",
            });
        }
        return [];
    }
}
export async function spotifyMe(volume) {
    const url = new URL("https://api.spotify.com/v1/me");
    const payload = {
        method: "GET",
        headers: {
            Authorization: `Bearer DEFER`,
        },
    };
    const params = new URLSearchParams({
        //volume_percent:50,
    });
    url.search = new URLSearchParams(params).toString();

    const response = await fetch401retry(url, payload);
    if (response.status === 403) {
        showSpotifyPremiumRequired();
        return {};
    }
    if (!response.ok) {
        throw new Error(`Spotify profile lookup failed: ${response.status}`);
    }
    const body = await response.json();
    return body;
}
export async function spotifyVolume(volume) {
    const url = new URL("https://api.spotify.com/v1/me/player/volume");
    const payload = {
        method: "PUT",
        headers: {
            Authorization: `Bearer DEFER`,
        },
    };
    const params = new URLSearchParams({
        volume_percent: volume,
    });
    url.search = new URLSearchParams(params).toString();

    const response = await fetch401retry(url, payload);
    console.log(`swiddle spotifyVolume response:`, response);
    if (!response.ok) {
        throw new Error(`Spotify volume failed: ${response.status}`);
    }
}

function sanitizeTrack(track) {
    if (track && track.length > 0) {
        track = track.replace(/^spotify:track:/, "");
        track = track.replace(/.*\//, "");
        track = track.replace(/\?.*/, "");
    }
    return track;
}

const spotifyTrackCache = new Map();

export function spotifyLookupTrack(track) {
    const trackId = sanitizeTrack(track);
    if (!trackId) {
        return Promise.reject(
            new Error("Spotify track lookup requires a track ID or URL.")
        );
    }

    if (!spotifyTrackCache.has(trackId)) {
        const lookup = (async () => {
            const url = new URL(
                `https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`
            );
            const payload = {
                method: "GET",
                headers: {
                    Authorization: "Bearer DEFER",
                },
            };
            const response = await fetch401retry(url, payload);
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                const error = new Error(
                    body?.error?.message ||
                        `Spotify track lookup failed: ${response.status}`
                );
                error.status = response.status;
                throw error;
            }
            return response.json();
        })();
        spotifyTrackCache.set(trackId, lookup);
        lookup.catch(() => spotifyTrackCache.delete(trackId));
    }
    return spotifyTrackCache.get(trackId);
}

export async function spotifyPlay(track, doPlay, recurse, deviceId) {
    log.debug(`spotifyPlay ${track}`);
    track = sanitizeTrack(track);
    log.debug(`spotifyPlay [sani] ${track}`);
    if (track && track.length > 0) {
    } else {
        doPlay = false;
    }

    if (!doPlay) {
        return { ok: true, skipped: true };
    }

    let trackMetadata;
    try {
        trackMetadata = await spotifyLookupTrack(track);
    } catch (error) {
        return {
            ok: false,
            reason: `Spotify could not verify that this walk-up track is clean: ${error.message}`,
        };
    }

    if (trackMetadata.explicit) {
        return {
            ok: false,
            reason: `Spotify marks “${trackMetadata.name || "this track"}” as explicit. Explicit walk-up tracks will not play.`,
        };
    }

    if (!deviceId) {
        pushMessage({
            key: "spotify-no-active-device",
            text: "Spotify has no active playback device. Start playback on the intended device, then try the walk-up again.",
            type: "error",
        });
        return { ok: false, reason: "Spotify has no active playback device." };
    }

    var url = new URL("https://api.spotify.com/v1/me/player/play");
    if (!doPlay) {
        url = new URL("https://api.spotify.com/v1/me/player/pause");
    }
    url.searchParams.set("device_id", deviceId);
    const payload = {
        method: "PUT",
        headers: {
            Authorization: `Bearer DEFER`,
            "Content-Type": "application/json",
        },
    };
    //uris:["spotify:track:4ZoBC5MhSEzuknIgAkBaoT"],
    if (doPlay) {
        payload.body = JSON.stringify({
            //position_ms: 5000,
            uris: [`spotify:track:${track}`],
            // context_uri: "spotify:album:5ht7ItJgpBH7W6vJ5BqpPr",
        });
    }

    const response = await fetch401retry(url, payload);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body?.error?.message || `HTTP ${response.status}`;
        const noActiveDevice = /no active device/i.test(detail);
        pushMessage({
            key: "spotify-playback-error",
            text: noActiveDevice
                ? "Spotify has no active device. Open Spotify on the intended playback device, start playback, and try again."
                : `Spotify playback failed: ${detail}`,
            type: "error",
        });
        return {
            ok: false,
            reason: noActiveDevice
                ? "Spotify has no active playback device."
                : `Spotify playback failed: ${detail}`,
        };
    }
    return { ok: true, response, track: trackMetadata };
}

export async function spotifyGetPlaybackState() {
    const url = new URL("https://api.spotify.com/v1/me/player");
    const payload = {
        method: "GET",
        headers: {
            Authorization: `Bearer DEFER`,
        },
    };

    const response = await fetch401retry(url, payload);
    if (response.status === 204 || response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(
            `Spotify playback state lookup failed: ${response.status}`
        );
    }
    const body = await response.json();
    if (!body || !body.item || !body.device) {
        return null;
    }
    return {
        deviceId: body.device.id,
        contextUri: body.context?.uri || null,
        trackUri: body.item.uri,
        positionMs: body.progress_ms || 0,
        isPlaying: Boolean(body.is_playing),
    };
}

export async function spotifyRestorePlaybackState(state) {
    if (!state || !state.isPlaying || !state.deviceId || !state.trackUri) {
        return { ok: true, skipped: true };
    }

    const url = new URL("https://api.spotify.com/v1/me/player/play");
    url.searchParams.set("device_id", state.deviceId);
    const payload = {
        method: "PUT",
        headers: {
            Authorization: `Bearer DEFER`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            state.contextUri
                ? {
                      context_uri: state.contextUri,
                      offset: { uri: state.trackUri },
                      position_ms: state.positionMs,
                  }
                : {
                      uris: [state.trackUri],
                      position_ms: state.positionMs,
                  }
        ),
    };

    const response = await fetch401retry(url, payload);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body?.error?.message || `HTTP ${response.status}`;
        pushMessage({
            key: "spotify-restore-error",
            text: `Spotify: could not resume previous playback: ${detail}`,
            type: "error",
        });
        return { ok: false, reason: detail };
    }
    return { ok: true };
}

const insertToken = (payload) => {
    const accessToken = getStore(spotifyAccessToken);
    payload.headers.Authorization = `Bearer ${accessToken}`;
};
const fetch401retry = async (url, payload) => {
    const accessToken = getStore(spotifyAccessToken);
    const refreshToken = getStore(spotifyRefreshToken);
    const expiresAt = Number(getStore(spotifyExpiresAt));
    if (
        refreshToken &&
        (!accessToken ||
            (expiresAt && Date.now() >= expiresAt - spotifyRefreshEarlyMs))
    ) {
        await refreshSpotifyToken();
    }

    insertToken(payload);
    const response = await fetch(url, payload);
    // const response = await body.json();
    log.debug(`fetch401retry spotifyPlay response:`, response);
    log.debug(`fetch401retry spotifyPlay response:`, response.status);
    if (response.status == 401) {
        await refreshSpotifyToken();
        insertToken(payload);
        const response2 = await fetch(url, payload);
        log.debug(`fetch401retry spotifyPlay response2:`, response2);
        log.debug(`fetch401retry spotifyPlay response2:`, response2.status);
        return response2;
    }
    return response;
};

export async function refreshSpotifyToken() {
    if (spotifyRefreshPromise) return spotifyRefreshPromise;

    spotifyRefreshPromise = (async () => {
        const refreshToken = getStore(spotifyRefreshToken);
        if (!refreshToken) {
            showSpotifyLoginExpired();
            throw new Error("Spotify refresh token is unavailable.");
        }

        const url = "https://accounts.spotify.com/api/token";
        const payload = {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: clientId,
            }),
        };
        const result = await fetch(url, payload);
        const response = await result.json().catch(() => ({}));

        if (!result.ok) {
            if (response.error === "invalid_grant") {
                showSpotifyLoginExpired();
            }
            throw new Error(
                `Spotify token refresh failed: ${response.error_description || response.error || result.status}`
            );
        }
        if (!response.access_token) {
            throw new Error(
                "Spotify token refresh failed: no access token returned."
            );
        }

        storeSpotifyTokenResponse(response);
        spotifyLoggedIn.set(true);
        return response.access_token;
    })();

    try {
        return await spotifyRefreshPromise;
    } finally {
        spotifyRefreshPromise = undefined;
    }
}
