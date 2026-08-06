import log from "loglevel";
import { pushMessage, spotifyLoggedIn } from "../stores.js";

const SS="cc79096dfc214db2bf5f51556ba6ef31"
const SID="36410c1155b640479eb8fb1c386ada8d"
const clientId = SID;
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const ssha256 = async(plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const rc=await window.crypto.subtle.digest('SHA-256', data)
  return rc
}
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}




export async function  getSpotifyPKCE(){
  //const redirectUri = 'https://0.0.0.0:8080/spotify_callback';
  const url = new URL(window.location.href);


  //const redirectUri = 'https://0.0.0.0:8080';
  const redirectUri = url.origin;
    localStorage.setItem('spotify:redirect', redirectUri);

  //const scope = 'user-read-private user-read-email';
  const scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state';
  const authUrl = new URL("https://accounts.spotify.com/authorize")

  // generated in the previous step
  const codeVerifierRaw  = generateRandomString(64);

  const codeVerifierSha256 = await ssha256(codeVerifierRaw);
  const codeVerifierB64 = base64encode(codeVerifierSha256);
  window.localStorage.setItem('spotify:code_verifier', codeVerifierRaw);

  const params =  {
    state: 'spotify_auth_callback',
    response_type: 'code',
    client_id: clientId,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeVerifierB64,
    redirect_uri: redirectUri,
  }

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();

}
export async function getSpotifyAccessToken (code ) {

  
  // stored in the previous step
  const codeVerifier = localStorage.getItem('spotify:code_verifier');
  const redirectUri = localStorage.getItem('spotify:redirect');


  const url = "https://accounts.spotify.com/api/token";
  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  }

  const body = await fetch(url, payload);
  const response = await body.json();

  if (!body.ok || !response?.access_token) {
    throw new Error(
      `Spotify token exchange failed: ${response?.error_description || response?.error || body.status}`
    );
  }

    localStorage.setItem('spotify:access_token', response.access_token);
    localStorage.setItem('spotify:refresh_token', response.refresh_token);
    spotifyLoggedIn.set(Boolean(response.refresh_token));
    window.location.replace("/"); // clear Spotify callback parameters without retaining them in history
}
export function logoutSpotify(){
  localStorage.removeItem('spotify:access_token' );
  localStorage.removeItem('spotify:refresh_token');
  localStorage.removeItem('spotify:code_verifier');
  localStorage.removeItem('spotify:redirect');
  spotifyLoggedIn.set(false);
}
    export async function urlParseSpotify() {
        const u = new URL(document.URL)

        if(u.searchParams.get("state") === "spotify_auth_callback"){
            const rtoken=u.searchParams.get("code") ;
            // Spotify authorization codes are single-use. Remove callback
            // parameters synchronously so remounts and BFCache restoration
            // cannot submit the same code again while this request is active.
            window.history.replaceState({}, document.title, `${u.pathname}${u.hash}`);
            await getSpotifyAccessToken(rtoken);
        }
    }

export async function spotifyListDevices() {

  const url = new URL("https://api.spotify.com/v1/me/player/devices");
  const payload = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer DEFER`,
    },
  }

  const response = await fetch401retry(url, payload);
  console.log(`swiddle spotifyListDevices response:`, response)
  const body = await response.json();
  return body;
      
}
export async function spotifyMe(volume) {
  spotifyListDevices();
  const url = new URL("https://api.spotify.com/v1/me");
  const payload = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer DEFER`,
    },
  }
  const params= new URLSearchParams({
    //volume_percent:50,
  });
  url.search = new URLSearchParams(params).toString();

  const response = await fetch401retry(url, payload);
  console.log(`swiddle spotifyMe response:`, response)
  const body = await response.json();
  return body;
      
}
export async function spotifyVolume(volume) {
  const url = new URL("https://api.spotify.com/v1/me/player/volume");
  const payload = {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer DEFER`,
    },
  }
  const params= new URLSearchParams({
    volume_percent:volume,
  });
  url.search = new URLSearchParams(params).toString();

  const response = await fetch401retry(url, payload);
  console.log(`swiddle spotifyVolume response:`, response)
  if (!response.ok) {
    throw new Error(`Spotify volume failed: ${response.status}`);
  }
      
}

function sanitizeTrack(track){
  if(track &&track.length >0){
    track=track.replace(/.*\//,"");
    track=track.replace(/\?.*/,"");
  }
  return track;
}
export async function spotifyPlay(track,doPlay,recurse) {
  const myLife='4ZoBC5MhSEzuknIgAkBaoT'
  log.debug(`spotifyPlay ${track}`)
  track=sanitizeTrack(track);
  log.debug(`spotifyPlay [sani] ${track}`)
  if(track&&track.length>0){}
  else{
    doPlay=false;
  }

  var url = new URL("https://api.spotify.com/v1/me/player/play");
  if (!doPlay){
    url = new URL("https://api.spotify.com/v1/me/player/pause");

  }
  if (!doPlay){
    return;  //Rolls DU30b Mic-Preamp/Audio Ducker
  }
  const payload = {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer DEFER`,
          'Content-Type': 'application/json',

    },
  }
          //uris:["spotify:track:4ZoBC5MhSEzuknIgAkBaoT"],
  if(doPlay){
        payload.body= JSON.stringify({
          //position_ms: 5000,
          uris:[`spotify:track:${track}`],
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
  }
  return response;
      
}

const insertToken=(payload) =>{
  const accessToken=  localStorage.getItem('spotify:access_token');
  payload.headers.Authorization= `Bearer ${accessToken}`;
};
const fetch401retry=async (url,payload) =>{

  insertToken(payload);
  const response = await fetch(url, payload);
 // const response = await body.json();
  log.debug(`fetch401retry spotifyPlay response:`, response)
  log.debug(`fetch401retry spotifyPlay response:`, response.status)
  if(response.status==401){
    await getRefreshToken();;
    insertToken(payload);
    const response2 = await fetch(url, payload);
    log.debug(`fetch401retry spotifyPlay response2:`, response2)
    log.debug(`fetch401retry spotifyPlay response2:`, response2.status)
    return response2
  }
  return response
};


const getRefreshToken = async () => {
    console.log(`swiddle spotify getRefreshToken`)

   // refresh token that has been previously stored
   const refreshToken = localStorage.getItem('spotify:refresh_token');
   const url = "https://accounts.spotify.com/api/token";

    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      }),
    }
    const body = await fetch(url, payload);
    const response = await body.json();

  if (body.ok) {
        console.log(`swiddle spotify getRefreshToken access: ${response.access_token}`)
    localStorage.setItem( 'spotify:access_token', response.access_token);
    spotifyLoggedIn.set(true);
    if (response.refresh_token) {
        console.log(`swiddle spotify getRefreshToken refresh: ${response.refresh_token}`)
      localStorage.setItem('spotify:refresh_token', response.refresh_token);
    }
  }
}
