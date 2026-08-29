import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import aws_exports from "../aws-config";

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

function createCognitoUserManager({
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

// Constructed once here (rather than in utilHosted.js) so both stores.js
// (the 401 retry path) and utilHosted.js (login/logout/callback) can import
// the same singleton without stores.js <-> utilHosted.js becoming a cycle.
export const cognitoUserManager = createCognitoUserManager({
    hostedUrl: aws_exports.hosted_url,
    clientId: aws_exports.aws_user_pools_hosted_client_id,
    redirectUri: `${window.location.origin}/`,
    region: aws_exports.aws_cognito_region,
    userPoolId: aws_exports.aws_user_pools_id,
});

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

// force=true bypasses the client-side expiry check: a 401 means the server
// rejected the token even though the client's clock may still consider it
// valid (clock skew, revocation), so it's worth a real signinSilent() rather
// than trusting the local expiry check.
export async function freshCognitoUser(userManager, force = false) {
    const user = await userManager.getUser();
    if (!user) return null;
    if (force || user.expired) return userManager.signinSilent();
    return user;
}
