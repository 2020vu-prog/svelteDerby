import axios from "axios";
import { initializeAwsConfig } from "./aws-config";

async function startApp() {
    const response = await axios.get("/app/getAwsConfig", {
        params: { cache: "[AIV]{date}[/AIV]" },
    });
    initializeAwsConfig(response.data);
    const { default: App } = await import("./App.svelte");

    return new App({
        target: document.body,
        props: {
            name: "world",
        },
    });
}

startApp().catch((error) => {
    console.error("Unable to load deployment configuration", error);
});
