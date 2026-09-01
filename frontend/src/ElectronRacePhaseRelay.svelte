<script>
    import log from "loglevel";
    import { driverMap, racePhaseMap, nextOnBlockKey } from "./stores.js";
    import { getCarNumber, getParticipant } from "./paInfo.js";

    // Tracks which phase key we've already relayed, so a re-render of the
    // same next-on-blocks phase (e.g. a timer result posting) doesn't
    // re-fire the event -- only an actual change of what's loaded should.
    let lastSentKey = "";

    $: sendIfNewRacePhase($nextOnBlockKey, $racePhaseMap, $driverMap);

    // "H"/"T"/"F"/"Y" phase types (hot/trial/fun/bye runs) have no numeric
    // heat -- matches the fallback labels used in utils.js's
    // fmtChartPosition, minus the bracket-name lookup this doesn't need.
    function getHeatNumberOrLabel(racePhase) {
        if (racePhase.bracketPos && racePhase.bracketPos.includes(":")) {
            const [, heat] = racePhase.bracketPos.split(":");
            return heat;
        }
        if (racePhase.pt && racePhase.pt.startsWith("H")) return "Hot Run";
        if (racePhase.pt && racePhase.pt.startsWith("T")) return "Trial Run";
        if (racePhase.pt && racePhase.pt.startsWith("F")) return "Fun Run";
        if (racePhase.pt && racePhase.pt.startsWith("Y")) return "Bye Run";
        return "Adhoc";
    }

    function laneInfo(racePhase, driverMapVal, lane) {
        const carNumber = getCarNumber(racePhase, lane);
        const participant = getParticipant(driverMapVal, carNumber);
        return {
            carNumber: carNumber ?? null,
            driverName: (participant && participant.name) || "",
        };
    }

    function sendIfNewRacePhase(key, racePhaseMapVal, driverMapVal) {
        const racePhase =
            typeof key === "string" && key ? racePhaseMapVal[key] : undefined;

        if (!racePhase || !racePhase.carNumbers) {
            // Nothing valid on the blocks -- nextOnBlockKey can be "", the
            // sentinel string "N/A", or an empty object {} depending on how
            // it was cleared, and none of those map to a real phase here.
            // Reset the dedup marker so a later reload of the *same* phase
            // (e.g. after correcting/removing results) isn't suppressed.
            lastSentKey = "";
            return;
        }
        if (key === lastSentKey) return;

        const lane1 = laneInfo(racePhase, driverMapVal, 1);
        const lane2 = laneInfo(racePhase, driverMapVal, 2);
        if (lane1.carNumber == null && lane2.carNumber == null) {
            lastSentKey = "";
            return;
        }

        lastSentKey = key;

        const payload = {
            heatNumber: getHeatNumberOrLabel(racePhase),
            lane1,
            lane2,
        };
        dispatchToElectron(payload);
    }

    function dispatchToElectron(payload) {
        const hookElement = document.getElementById("udpRacePhaseSpan");
        if (!hookElement) return; // not running inside the electron shell
        log.debug("racePhase relay: dispatching", payload);
        hookElement.dispatchEvent(
            new CustomEvent("racePhaseEntered", {
                detail: JSON.stringify(payload),
            })
        );
    }
</script>

<span id="udpRacePhaseSpan" />
