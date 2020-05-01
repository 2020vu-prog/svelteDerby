const { hasSvelteRoutePath } = require('../backend/modules/lambdaDerby/src/shared/PermissionLookup.js')
import { Auth } from 'aws-amplify';

export async function isUserAllowedRoutePath(routePath) {


    try {

        const user = await Auth.currentAuthenticatedUser()
        const attributes = await Auth.userAttributes(user);
        console.log("cognito attrs:", attributes)
        const email = attributes.filter(a => { return a.Name === "email"; })[0].getValue();
        console.log("cognito email:", email)
        return email && hasSvelteRoutePath(email, routePath);

    }
    catch (err) {
        console.log("isUserAllowedRoutePath", err);
        return false;
    }

}
export function safeGetAt(map, key) {
    if (map && key && map[key]) {
        return map[key].at;
    }
    else {
        return 0;
    }
}
export function buildDate() {
    return '[AIV]{date}[/AIV]'
}
export function buildVersion() {
    return '[AIV]{version}[/AIV]'
}