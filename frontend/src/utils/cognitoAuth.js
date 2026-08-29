import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const COGNITO_URL_STATE = "cognito";

export function isCognitoCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const hasResponse =
        url.searchParams.has("code") || url.searchParams.has("error");
    return (
        hasResponse &&
        url.searchParams.get("state")?.endsWith(`;${COGNITO_URL_STATE}`)
    );
}

function clearCallbackParameters(callbackUrl) {
    const url = new URL(callbackUrl);
    for (const key of [
        "code",
        "error",
        "error_description",
        "session_state",
        "state",
    ]) {
        url.searchParams.delete(key);
    }
    return url.toString();
}

export function createCognitoUserManager({
    hostedUrl,
    clientId,
    redirectUri,
    region,
    userPoolId,
}) {
    const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    return new UserManager({
        authority,
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "email openid phone",
        automaticSilentRenew: true,
        accessTokenExpiringNotificationTimeInSeconds: 300,
        loadUserInfo: false,
        monitorSession: false,
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        metadata: {
            issuer: authority,
            authorization_endpoint: `${hostedUrl}/oauth2/authorize`,
            token_endpoint: `${hostedUrl}/oauth2/token`,
            revocation_endpoint: `${hostedUrl}/oauth2/revoke`,
            end_session_endpoint: `${hostedUrl}/logout`,
            jwks_uri: `${authority}/.well-known/jwks.json`,
        },
    });
}

export function beginCognitoLogin(userManager) {
    return userManager.signinRedirect({ url_state: COGNITO_URL_STATE });
}

// Strips the callback's code/state params from the URL even when the
// exchange fails -- otherwise a failed exchange leaves a consumed `code` in
// place and every retry (remount, refresh) fails identically forever.
export async function completeCognitoLogin(userManager, callbackUrl) {
    if (!isCognitoCallback(callbackUrl)) return null;
    try {
        return await userManager.signinRedirectCallback(callbackUrl);
    } finally {
        history.replaceState(
            {},
            document.title,
            clearCallbackParameters(callbackUrl)
        );
    }
}

export async function freshCognitoUser(userManager) {
    const user = await userManager.getUser();
    if (!user) return null;
    if (user.expired) return userManager.signinSilent();
    return user;
}
