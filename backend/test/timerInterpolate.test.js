// from: https://github.com/d3/d3-interpolate/blob/main/src/round.js
const d3InterpolateNumber = function (a, b) {
    return (
        (a = +a),
        (b = +b),
        function (t) {
            return Math.round(a * (1 - t) + b * t);
        }
    );
};
function getRpiPct(lo, hi, actual) {
    const range = hi - lo;
    return (actual - lo) / range;
}

test("i0: ", () => {
    rpiLo = 44000;
    rpiHi = 44500;
    rpiTick = 44602;

    const gps = d3InterpolateNumber(5000, 5900);
    const rpi = d3InterpolateNumber(rpiLo, rpiHi);
    const piPct = getRpiPct(rpiLo, rpiHi, rpiTick);

    expect(piPct).toBeCloseTo(1.204);
    expect(gps(piPct)).toBe(6084);
});
