var Buffer = require("buffer/").Buffer;
var WebSocket = require("ws");
var ConfigParser = require("configparser");
var OpusFileStream = require("./opus-file-stream");
const TokenManager = require("./tokenmanager");
var mainPromise = null;

// Global variables to handle user's SIGINT action
var zelloSocket = null;
var zelloStreamId = null;
var zelloToken = null;
var zelloRefresh = null;

function zelloAuthorize(
    ws,
    opusStream,
    username,
    password,
    token,
    channel,
    onCompleteCb
) {
    console.log(`zelloAuth [${username}] [${password}] [${channel}]`);
    var tokenType = "auth_token";
    var tokenData = token;
    if (zelloRefresh) {
        tokenType = "refresh_token";
        tokenData = zelloRefresh;
    }
    const authJsonRequest = JSON.stringify({
        seq: 1,
        command: "logon",
        [tokenType]: tokenData,
        username: username,
        password: password,
        channel: channel,
    });
    console.log(`authJsonRequest ${authJsonRequest}`);
    ws.send(authJsonRequest);

    let isAuthorized = false,
        isChannelAvailable = false;
    const authTimeoutMs = 2000;
    const authTimeout = setTimeout(onCompleteCb, authTimeoutMs, false);
    ws.onmessage = function (event) {
        try {
            console.log(`zelloAuth  message: [${event.data}] `);
            const json = JSON.parse(event.data);
            if (json.refresh_token) {
                isAuthorized = true;
            } else if (
                json.command === "on_channel_status" &&
                json.status === "online"
            ) {
                isChannelAvailable = true;
            }
        } catch (e) {
            console.log(`zelloAuth err[${e}] `);
            // Not a JSON - ignore the message
            return;
        }
        if (isAuthorized && isChannelAvailable) {
            clearTimeout(authTimeout);
            return onCompleteCb(true);
        }
    };
}

function zelloStartStream(ws, opusStream, onCompleteCb) {
    console.log("zelloStartStream");
    let codecHeaderRaw = new Uint8Array(4);
    codecHeaderRaw[2] = opusStream.framesPerPacket;
    codecHeaderRaw[3] = opusStream.packetDurationMs;

    // sampleRate is represented in two bytes in little endian.
    // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
    codecHeaderRaw[0] = parseInt(opusStream.sampleRate & 0xff, 10);
    codecHeaderRaw[1] = parseInt(opusStream.sampleRate / 0x100, 10) & 0xff;
    const codecHeader = Buffer.from(codecHeaderRaw).toString("base64");

    const ss = JSON.stringify({
        command: "start_stream",
        seq: 2,
        type: "audio",
        codec: "opus",
        codec_header: codecHeader,
        packet_duration: opusStream.packetDurationMs,
    });
    console.log(ss);
    ws.send(ss);

    const startTimeoutMs = 2000;
    const startTimeout = setTimeout(onCompleteCb, startTimeoutMs, null);
    ws.onmessage = function (event) {
        console.log(`om2  message: [${event.data}] `);
        try {
            const json = JSON.parse(event.data);
            if (json.success && json.stream_id) {
                clearTimeout(startTimeout);
                return onCompleteCb(json.stream_id);
            } else if (json.error) {
                console.log("Got an error: " + json.error);
                clearTimeout(startTimeout);
                return onCompleteCb(null);
            }
        } catch (e) {
            // Not a JSON - ignore the message
            return;
        }
    };
}

function getCurrentTimeMs() {
    const now = new Date();
    return now.getTime();
}

function zelloGenerateAudioPacket(data, streamId, packetId) {
    console.log("zelloAudio");
    // https://github.com/zelloptt/zello-channel-api/blob/master/API.md#stream-data
    let packet = new Uint8Array(data.length + 9);
    packet[0] = 1;

    let id = streamId;
    for (let i = 4; i > 0; i--) {
        packet[i] = parseInt(id & 0xff, 10);
        id = parseInt(id / 0x100, 10);
    }

    id = packetId;
    for (let i = 8; i > 4; i--) {
        packet[i] = parseInt(id & 0xff, 10);
        id = parseInt(id / 0x100, 10);
    }
    packet.set(data, 9);
    return packet;
}

function zelloSendAudioPacket(
    ws,
    packet,
    startTsMs,
    timeStreamingMs,
    onCompleteCb
) {
    const timeElapsedMs = getCurrentTimeMs() - startTsMs;
    const sleepDelayMs = timeStreamingMs - timeElapsedMs;

    console.log(
        `sleep delay [${sleepDelayMs}] tsms: [${timeStreamingMs}] startMs: [${startTsMs}]`
    );
    ws.send(packet);
    if (sleepDelayMs < 1) {
        return onCompleteCb();
    }
    if (false) {
        return onCompleteCb();
    } else {
        setTimeout(onCompleteCb, sleepDelayMs);
        // setTimeout(onCompleteCb, sleepDelayMs-7);
    }
}

function zelloStreamSendAudio(ws, opusStream, streamId, onCompleteCb) {
    const startTsMs = getCurrentTimeMs();
    let timeStreamingMs = 0;
    let packetId = 0;
    const zelloStreamNextPacket = function () {
        opusStream.getNextOpusPacket(null, false, function (data) {
            if (!data) {
                console.log("Audio stream is over");
                return onCompleteCb(true);
            }
            console.log("data:", data.length);

            const packet = zelloGenerateAudioPacket(data, streamId, packetId);
            timeStreamingMs += opusStream.packetDurationMs;
            packetId++;
            zelloSendAudioPacket(
                ws,
                packet,
                startTsMs,
                timeStreamingMs,
                function () {
                    return zelloStreamNextPacket();
                }
            );
        });
    };
    zelloStreamNextPacket();
    ws.onmessage = function (event) {
        console.log(`om3  message: [${event.data}] `);
        return;
    };
}

function logMessage(event) {
    console.log(`oml  message: [${event.data}] `);
}
function zelloStopStream(ws, streamId) {
    ws.send(
        JSON.stringify({
            command: "stop_stream",
            stream_id: streamId,
        })
    );
    // Invalidate the global stream ID once stop request is sent
    zelloStreamId = null;
}

function zelloStreamReadyCb(opusStream, username, password, token, channel) {
    const ws = new WebSocket("wss://zello.io/ws");

    ws.onerror = function () {
        console.error("Websocket error");
        ws.close();
    };

    ws.onclose = function () {
        if (!zelloSocket) {
            mainResolve("Failed to connect to server");
        }
        zelloSocket = null;
        if (zelloStreamId) {
            mainResolve("Connection has been closed unexpectedly");
        } else {
            mainResolve("websocket closed (normally");
        }
    };

    ws.onopen = function () {
        zelloSocket = ws;

        zelloAuthorize(
            ws,
            opusStream,
            username,
            password,
            token,
            channel,
            function (success) {
                ws.onmessage = logMessage;
                if (!success) {
                    console.error("Failed to authorize");
                    ws.close();
                } else {
                    console.log(
                        "User " +
                            username +
                            " has been authenticated on " +
                            channel +
                            " channel. " +
                            JSON.stringify(success)
                    );
                    if (success.refresh_token) {
                        zelloRefresh = success.refresh_token;
                        console.log(`Saved zelloRefresh: ${zelloRefresh}`);
                    }
                    zelloStartStream(ws, opusStream, function (streamId) {
                        ws.onmessage = logMessage;
                        if (!streamId) {
                            console.error("Failed to start Zello stream");
                            ws.close();
                        } else {
                            zelloStreamId = streamId;
                            console.log(
                                "Started streaming " + opusStream.filename
                            );
                            zelloStreamSendAudio(
                                ws,
                                opusStream,
                                streamId,
                                function (success) {
                                    if (!success) {
                                        console.error("Failed to stream audio");
                                    }
                                    zelloStopStream(ws, streamId);
                                    ws.close();
                                    mainResolve("zelloStreamSendAudio success");
                                }
                            );
                        }
                    });
                }
            }
        );
    };
}

process.on("SIGINT", function () {
    console.log("Stopped by user");
    if (zelloSocket) {
        if (zelloStreamId) {
            zelloStopStream(zelloSocket, zelloStreamId);
        }
        zelloSocket.close();
    }
    mainResolve("Sigint");
});

/*
var config = new ConfigParser();
try {
    process.chdir('../');
    config.read('stream.conf');
} catch(error) {
    console.error(`Failed to open a config file.\n${error.message}`);
    process.exit(1);
}

*/
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function mainResolve(msg) {
    console.error("mainResolve: ", msg);
    mainPromise.resolve(msg);
}
function lambdaEntry(fname) {
    //https://stackoverflow.com/questions/31069453/creating-a-es6-promise-without-starting-to-resolve-it
    var rc = new Promise(function (resolve, reject) {
        mainPromise = { resolve: resolve, reject: reject };
    });
    console.log(`begin lambdaEntry`);
    var zelloUsername = process.env.ZelloUsername;
    var zelloPassword = process.env.ZelloPassword;
    const pk_buff = new Buffer(process.env.ZELLO_PRIVATE_KEY, "base64");
    const zelloPrivateKey = pk_buff.toString("utf8");
    // token re-use caused:
    /*
    INFO	zelloAuth  message: [
        {
            "error": "not authorized",
            "seq": 1
        }
        ] 

    */
    if (true) {
        //console.log(`INIT first time zelloToken`);
        zelloToken = TokenManager.createJwt(
            process.env.ZELLO_ISSUER,
            zelloPrivateKey
        );
    }
    var zelloChannel = "AASBD Chicago P.A";
    var zelloFilename = fname;
    if (
        !zelloUsername ||
        !zelloPassword ||
        !zelloToken ||
        !zelloChannel ||
        !zelloFilename
    ) {
        mainResolve("invalid congfig");
        return rc;
    }

    console.log(`begin ofs [${fname}]`);
    new OpusFileStream(zelloFilename, function (opusStream) {
        if (!opusStream) {
            mainResolve("Failed to start Opus media stream");
            return rc;
        }
        zelloStreamReadyCb(
            opusStream,
            zelloUsername,
            zelloPassword,
            zelloToken,
            zelloChannel
        );
    });
    return rc;
}
module.exports = lambdaEntry;
