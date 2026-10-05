import axios from "axios";
import { mount } from "svelte";
import { initializeAwsConfig } from "#src/aws-config";

async function startApp() {
    const response = await axios.get("/app/getAwsConfig", {
        params: { cache: "[AIV]{date}[/AIV]" },
    });
    initializeAwsConfig(response.data);
    const { default: App } = await import("#src/App.svelte");

    return mount(App, {
        target: document.body,
        props: {
            name: "world",
        },
    });
}

startApp().catch((error) => {
    console.error("Unable to load deployment configuration", error);
});
