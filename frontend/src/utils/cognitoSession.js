import log from "loglevel";
import aws_exports from "../aws-config";
import {
    beginCognitoLogin as redirectToCognitoLogin,
    completeCognitoLogin,
    createCognitoUserManager,
    freshCognitoUser,
    removeCognitoUser,
} from "./cognitoAuth.js";
const jwt = require("jsonwebtoken");

const cognitoUserManager = createCognitoUserManager({
    hostedUrl: aws_exports.hosted_url,
    clientId: aws_exports.aws_user_pools_hosted_client_id,
    redirectUri: `${window.location.origin}/`,
    region: aws_exports.aws_cognito_region,
    userPoolId: aws_exports.aws_user_pools_id,
});

let getIdToken = () => "";
let setIdToken = () => {};
let refreshPromise;

function storeCognitoUser(user) {
    setIdToken(user?.id_token || "");
}

cognitoUserManager.events.addUserLoaded(storeCognitoUser);
cognitoUserManager.events.addUserUnloaded(() => storeCognitoUser(null));
cognitoUserManager.events.addSilentRenewError((error) =>
    log.warn("Cognito automatic token renewal failed", error)
);

export function configureCognitoSession(tokenStore) {
    getIdToken = tokenStore.get;
    setIdToken = tokenStore.set;
}

export function beginCognitoLogin() {
    return redirectToCognitoLogin(cognitoUserManager);
}

export async function initializeCognitoSession(callbackUrl) {
    const callbackUser = await completeCognitoLogin(
        cognitoUserManager,
        callbackUrl
    );
    if (callbackUser) {
        storeCognitoUser(callbackUser);
        return callbackUser.id_token;
    }
    return ensureFreshCognitoSession();
}

export async function ensureFreshCognitoSession(force = false) {
    if (!refreshPromise) {
        refreshPromise = freshCognitoUser(cognitoUserManager, force)
            .then((user) => {
                if (user) {
                    storeCognitoUser(user);
                    return user.id_token;
                }
                // During the staged implicit-to-code migration, honor an
                // existing unexpired ID token until the user next signs in.
                const legacyToken = getIdToken();
                const legacyClaims = legacyToken ? jwt.decode(legacyToken) : null;
                if (
                    !force &&
                    legacyClaims?.exp &&
                    legacyClaims.exp > Date.now() / 1000
                ) {
                    return legacyToken;
                }
                storeCognitoUser(null);
                return "";
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

export async function clearCognitoSession() {
    try {
        await removeCognitoUser(cognitoUserManager);
    } finally {
        storeCognitoUser(null);
    }
}
