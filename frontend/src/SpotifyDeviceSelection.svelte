<script>
    import { spotifySelectedDeviceId } from "./stores.js";
    import { spotifySelectableDevices } from "./utils/spotify.js";

    export let readOnly = false;
    let devicesPromise;

    function selectedDevice(devices) {
        return $spotifySelectedDeviceId
            ? devices.find((device) => device.id === $spotifySelectedDeviceId)
            : devices.find((device) => device.is_active);
    }

    async function loadDevices() {
        const devices = await spotifySelectableDevices();
        if (
            $spotifySelectedDeviceId &&
            !devices.some((device) => device.id === $spotifySelectedDeviceId)
        ) {
            $spotifySelectedDeviceId = "";
        }
        return devices;
    }

    function refreshDevices() {
        devicesPromise = loadDevices();
    }

    refreshDevices();
</script>

<section
    class:deviceSelection={!readOnly}
    class:deviceStatus={readOnly}
    aria-label="Spotify playback device"
>
    {#if !readOnly}
        <strong>Walk-up playback device</strong>
    {/if}
    {#await devicesPromise}
        {#if readOnly}
            <span>Spotify device: Loading…</span>
        {:else}
            <p>Loading Spotify devices…</p>
        {/if}
    {:then devices}
        {#if readOnly}
            {@const device = selectedDevice(devices)}
            <span>
                Spotify device:
                {device
                    ? `${device.name} (${device.type})`
                    : $spotifySelectedDeviceId
                      ? "Selected Spotify device is unavailable"
                      : "No active Spotify device"}
            </span>
        {:else if devices.length > 0}
            <div>
                <select bind:value={$spotifySelectedDeviceId}>
                    <option value="">Active Spotify device (automatic)</option>
                    {#each devices as device (device.id)}
                        <option value={device.id}>
                            {device.name} ({device.type}){device.is_active
                                ? " — active"
                                : ""}
                        </option>
                    {/each}
                </select>
            </div>
            <p>
                Derby will use the selected device for the entire walk-up.
                Automatic mode only uses a device Spotify reports as active.
            </p>
        {:else}
            <p>No controllable Spotify devices are currently available.</p>
        {/if}
        {#if !readOnly}
            <button type="button" on:click={refreshDevices}
                >Refresh devices</button
            >
        {/if}
    {/await}
</section>

<style>
    .deviceSelection {
        margin: 1rem 0;
        padding: 1rem;
        border: 1px solid #888;
    }

    .deviceStatus {
        display: block;
        margin-top: 0.35rem;
    }

    select,
    button {
        font-size: 1rem;
        margin-top: 0.5rem;
        padding: 0.5rem;
    }
</style>
