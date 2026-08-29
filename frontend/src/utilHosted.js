import log from "loglevel";
import { userJwtStore } from "./stores.js";
import {
    cognitoUserManager,
    beginCognitoLogin as signinRedirect,
    completeCognitoLogin,
    freshCognitoUser,
} from "./utils/cognitoAuth.js";

// Keeps userJwtStore in sync as oidc-client-ts's automaticSilentRenew mints
// fresh tokens in the background -- this is what "extends login" past the
// old id_token lifetime without the user re-authenticating.
cognitoUserManager.events.addUserLoaded((user) =>
    userJwtStore.set(user.id_token)
);
cognitoUserManager.events.addUserUnloaded(() => userJwtStore.set(""));
cognitoUserManager.events.addSilentRenewError((error) =>
    log.warn("Cognito silent token renewal failed", error)
);

export async function setIdTokenFromCognitoCallback() {
    try {
        const callbackUser = await completeCognitoLogin(
            cognitoUserManager,
            document.URL
        );
        const user =
            callbackUser || (await freshCognitoUser(cognitoUserManager));
        userJwtStore.set(user?.id_token || "");
    } catch (error) {
        log.warn("Cognito session restore failed", error);
        userJwtStore.set("");
    }
}

export function beginCognitoLogin() {
    return signinRedirect(cognitoUserManager);
}

export function cognitoLogout() {
    cognitoUserManager
        .removeUser()
        .catch((error) => log.warn("Cognito local sign-out failed", error));
}
