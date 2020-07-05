class AnnounceResults {
    announceResults(tgtRs) {
        var rc = "";
        var aPhaseMsg = "";
        var aWinCarNumber = "";
        var bWinCarNumber = "";
        var overallWinCarNumber = "";
        var aPhaseMsg = "";
        var bPhaseMsg = "";
        var overallMsg = "";
        [aWinCarNumber, aPhaseMsg] = this.formatMsg(
            "Phase AE ",
            tgtRs.carNumbers,
            tgtRs.phase1DeltaMS
        );

        if (tgtRs.phase1DeltaMS && !tgtRs.phase2DeltaMS) {
            rc += aPhaseMsg;
            return rc;
        }
        if (tgtRs.phase2DeltaMS) {
            [bWinCarNumber, bPhaseMsg] = this.formatMsg(
                "Phase B ",
                tgtRs.carNumbers,
                tgtRs.phase2DeltaMS
            );
            [overallWinCarNumber, overallMsg] = this.formatMsg(
                "Overall",
                tgtRs.carNumbers,
                tgtRs.phase1DeltaMS + tgtRs.phase2DeltaMS
            );
            rc += bPhaseMsg;
            if (
                bWinCarNumber &&
                aWinCarNumber &&
                aWinCarNumber === bWinCarNumber
            ) {
                //double phase, no interjection
            } else if (bWinCarNumber === overallWinCarNumber) {
                rc +=
                    " That is enough ... " +
                    this.expandDigitsForSpeech(bWinCarNumber.toString());
            } else {
                rc += " However, that is not enough ... ";
            }
            rc += overallMsg;
        }
        console.log("ANNOUNCEMENT RESULT: ", rc);
        return rc;
    }
    expandDigitsForSpeech(cn) {
        return cn.replace("", " ");
    }
    formatMsg(phaseDescriptor, cnArray, phaseResultMS) {
        var returnCarNumber = "";
        var returnMessage = "";
        if (phaseResultMS == 0) {
            returnMessage += " THE " + phaseDescriptor + " Result is a Tie. ";
        }
        if (phaseResultMS < 0) {
            returnCarNumber = cnArray[1];
            returnMessage += this.formatMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        if (phaseResultMS > 0) {
            returnCarNumber = cnArray[0];
            returnMessage += this.formatMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        returnMessage += " ";
        return [returnCarNumber, returnMessage];
    }
    formatMsgWithCar(winningCar, phaseDescriptor, phaseResultMS) {
        var rc = "";
        const spokenCar = this.expandDigitsForSpeech(winningCar.toString());
        const spokenDriver = getDrivenByPhoneticName(winningCar);
        rc += `Your ${phaseDescriptor} Winner is Car ${spokenCar}, ${spokenDriver}`;
        rc += " ... ";
        const spokenTime = this.expandDigitsForSpeech(Math.abs(phaseResultMS));
        //TODO: %03d
        rc += ` The ${phaseDescriptor} time is ${spokenTime} `;
        rc += " ... ";
        return rc;
    }

    getDrivenByPhoneticName(winningCar) {
        var phoneticName = ""; //racerCache.lookupPhoneticName(winningCar);
        //TODO: lookup phoenetic name
        // lousy hack for missing phonetic name on db.
        if (phoneticName) {
            return ` driven by ${phoneticName} `;
        }
        return "";
    }
}

module.exports = AnnounceResults;
