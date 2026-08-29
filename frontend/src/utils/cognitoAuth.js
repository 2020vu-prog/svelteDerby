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

export function clearCognitoCallbackParameters(callbackUrl) {
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
        revokeTokensOnSignout: true,
        revokeTokenTypes: ["refresh_token"],
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

export async function completeCognitoLogin(userManager, callbackUrl) {
    if (!isCognitoCallback(callbackUrl)) return null;
    const user = await userManager.signinRedirectCallback(callbackUrl);
    history.replaceState(
        {},
        document.title,
        clearCognitoCallbackParameters(callbackUrl)
    );
    return user;
}

export async function freshCognitoUser(userManager, force = false) {
    let user = await userManager.getUser();
    if (!user) return null;
    if (force || user.expired || (user.expires_in ?? 0) <= 300) {
        user = await userManager.signinSilent();
    }
    return user;
}

export async function removeCognitoUser(userManager) {
    try {
        await userManager.revokeTokens(["refresh_token"]);
    } finally {
        await userManager.removeUser();
    }
}
