//import { idToken } from './lib/stores.js'
import { userJwtStore } from "./stores.js";
export function setIdTokenFromCognitoCallback() {
    ucode();
    uatoken();
    urlParse();
    // console.log(`The current page is: ${$location}`, $location);
    // console.log(`The current querystring is: ${$querystring}`, $querystring);
    console.log(`The current url is: ${document.URL}`);
    //replace('/mock')
    //replace('/login')
}
export function ucode() {
    const regexpSize = /code=([^#]*)/;
    const match = document.URL.match(regexpSize);
    if (match && match[1]) {
        console.log(`Twiddle m ${match[1]}`);
    }
}
export function uatoken() {
    const regexpSize = /access_token=([^#]*)/;
    const match = document.URL.match(regexpSize);
    if (match && match[1]) {
        console.log(`Twiddle at ${match[1]}`);
    }
}
export function urlParse() {
    const u = new URL(document.URL);
    console.log(`Twiddle qu:`, u);
    console.log(`Twiddle h ${u.hash}`);
    let tokenHash = u.hash.replace("#", "");

    const words = tokenHash.split("&");
    console.log(`Twiddle words`, words);
    for (const element of words) {
        const [key, val] = element.split("=");
        console.log(`elem K:`, decodeURIComponent(key));
        console.log(`elem V:`, decodeURIComponent(val));
        if (key === "id_token") {
            localStorage.setItem("id_token", val);

            //$idToken = val
            console.log(`id_token :`, val);
            userJwtStore.set(val);
        }
    }
}
