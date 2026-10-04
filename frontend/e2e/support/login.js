const { expect } = require("@playwright/test");

/**
 * Signs in through the real Cognito hosted login page, the same way a person
 * does: Login button on the app's login screen, credentials on the hosted
 * page, redirect back, session restored.
 */
async function signIn(page, { username, password }) {
    await page.goto("/#/loginH");
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL(/amazoncognito\.com/);
    await page.locator("#signInFormUsername:visible").fill(username);
    await page.locator("#signInFormPassword:visible").fill(password);
    await page.locator("input[name='signInSubmitButton']:visible").click();

    // Back on the app with the callback params consumed; it lands on the
    // organization list. Wait for the session to be stored, then confirm it on
    // the login screen, which shows "Email: [<address>]" once signed in. The
    // test user's sign-in name need not equal its email, so match any value.
    await page.waitForFunction(() =>
        Object.keys(localStorage).some((key) => key.startsWith("oidc.user:"))
    );
    await page.goto("/#/loginH");
    await expect(page.getByText(/Email: \[.+\]/)).toBeVisible({
        timeout: 15000,
    });
}

module.exports = { signIn };
