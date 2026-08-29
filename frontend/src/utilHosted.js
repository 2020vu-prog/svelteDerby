import log from "loglevel";
import aws_exports from "./aws-config";
import { userJwtStore } from "./stores.js";
import {
    createCognitoUserManager,
    beginCognitoLogin as signinRedirect,
    completeCognitoLogin,
    freshCognitoUser,
} from "./utils/cognitoAuth.js";

export const cognitoUserManager = createCognitoUserManager({
    hostedUrl: aws_exports.hosted_url,
    clientId: aws_exports.aws_user_pools_hosted_client_id,
    redirectUri: `${window.location.origin}/`,
    region: aws_exports.aws_cognito_region,
    userPoolId: aws_exports.aws_user_pools_id,
});

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
        const user = callbackUser || (await freshCognitoUser(cognitoUserManager));
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
