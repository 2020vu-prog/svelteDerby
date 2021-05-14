var Buffer = require('buffer/').Buffer;
var WebSocket = require('ws');
var ConfigParser = require('configparser');
var OpusFileStream = require('./opus-file-stream');

// Global variables to handle user's SIGINT action
var zelloSocket = null;
var zelloStreamId = null;

function zelloAuthorize(ws, opusStream, username, password, token, channel, onCompleteCb) {
                console.log(`zelloAuth [${username}] [${password}] [${channel}]`);
    ws.send(JSON.stringify({
        seq: 1,
        command: "logon",
        auth_token: token,
        username: username,
        password: password,
        channel: channel,
    }));

    let isAuthorized = false, isChannelAvailable = false;
    const authTimeoutMs = 2000;
    const authTimeout = setTimeout(onCompleteCb, authTimeoutMs, false);
    ws.onmessage = function(event) {
        try {
                console.log(`zelloAuth  message: [${event.data}] `);
            const json = JSON.parse(event.data);
            if (json.refresh_token) {
                isAuthorized = true;
            } else if (json.command === "on_channel_status" && json.status === "online") {
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
    }
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
    const codecHeader = Buffer.from(codecHeaderRaw).toString('base64');

    const ss=JSON.stringify({
        "command": "start_stream",
        "seq": 2,
        "type": "audio",
        "codec": "opus",
        "codec_header": codecHeader,
        "packet_duration": opusStream.packetDurationMs,
    });
    console.log(ss);
    ws.send(ss)

    const startTimeoutMs = 2000;
    const startTimeout = setTimeout(onCompleteCb, startTimeoutMs, null);
    ws.onmessage = function(event) {
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
    }
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

function zelloSendAudioPacket(ws, packet, startTsMs, timeStreamingMs, onCompleteCb) {
    const timeElapsedMs = getCurrentTimeMs() - startTsMs;
    const sleepDelayMs = timeStreamingMs - timeElapsedMs;

    console.log(`sleep delay [${sleepDelayMs} ts: [${timeStreamingMs}]` );
    ws.send(packet);
    if (sleepDelayMs < 1) {
        return onCompleteCb();
    }
    if (false) {
	    return onCompleteCb();
	}
	else{
	    setTimeout(onCompleteCb, sleepDelayMs);
	   // setTimeout(onCompleteCb, sleepDelayMs-7);
	}
}

function zelloStreamSendAudio(ws, opusStream, streamId, onCompleteCb) {
    const startTsMs = getCurrentTimeMs();
    let timeStreamingMs = 0;
    let packetId = 0;
    const zelloStreamNextPacket = function() {
        opusStream.getNextOpusPacket(null, false, function(data) {
            if (!data) {
                console.log("Audio stream is over");
                return onCompleteCb(true);
            }
            console.log("data:",data.length);

            const packet = zelloGenerateAudioPacket(data, streamId, packetId);
            timeStreamingMs += opusStream.packetDurationMs;
            packetId++;
            zelloSendAudioPacket(ws, packet, startTsMs, timeStreamingMs, function() {
                return zelloStreamNextPacket();
            });
        });
    }
    zelloStreamNextPacket();
    ws.onmessage = function(event) {
                console.log(`om3  message: [${event.data}] `);
        return;
    }
}

function logMessage(event){
                console.log(`oml  message: [${event.data}] `);
}
function zelloStopStream(ws, streamId) {
    ws.send(JSON.stringify({
        command: "stop_stream",
        stream_id: streamId}));
    // Invalidate the global stream ID once stop request is sent
    zelloStreamId = null;
}

function zelloStreamReadyCb(opusStream, username, password, token, channel) {
    const ws = new WebSocket("wss://zello.io/ws");

    ws.onerror = function() {
        console.error("Websocket error");
        ws.close()
    };

    ws.onclose = function() {
        if (!zelloSocket) {
            console.error("Failed to connect to server");
        }
        zelloSocket = null;
        if (zelloStreamId) {
            console.error("Connection has been closed unexpectedly");
            process.exit(1);
        } else {
            process.exit();
        }
    };

    ws.onopen = function() {
        zelloSocket = ws;

        zelloAuthorize(ws, opusStream, username, password, token, channel, function(success) {
            ws.onmessage = logMessage;
            if (!success) {
                console.error("Failed to authorize");
                ws.close();
            } else {
                console.log("User " + username + " has been authenticated on " + channel + " channel");
                zelloStartStream(ws, opusStream, function(streamId) {
		    ws.onmessage = logMessage;
                    if (!streamId) {
                        console.error("Failed to start Zello stream");
                        ws.close();
                    } else {
                        zelloStreamId = streamId;
                        console.log("Started streaming " + opusStream.filename);
                        zelloStreamSendAudio(ws, opusStream, streamId, function(success) {
                            if (!success) {
                                console.error("Failed to stream audio");
                            }
                            zelloStopStream(ws, streamId);
                            ws.close();
                            process.exit();
                        });
                    }
                });
            }
        });
    };
}

process.on("SIGINT", function() {
    console.log("Stopped by user");
    if (zelloSocket) {
        if (zelloStreamId) {
            zelloStopStream(zelloSocket, zelloStreamId);
        }
        zelloSocket.close();
    }
    process.exit();
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
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function lambdaEntry( fname ){
                console.log(`begin lambdaEntry`);
	var zelloUsername = 'cwitte.pa'
	var zelloPassword = 'cwitte.pa.77'
	var zelloToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJXa002WTNkcGRIUmxNekE2TVE9PS5oTVBqc3ZYNHpEUnp0dEZndXJYUE1QNVJzdlZHS28waWlmY0UwWllFaWJBPSIsImV4cCI6MTYyMzIzOTQ5MywiYXpwIjoiZGV2In0=.ke+fVWplRJeaKwlmLqib5NLsZ304Q/4433iVlKsgHiLLUv8VlxmeogQCMnITHXvqQT8hNlEqgXJHPUDzgs1BeDbbt7NbOQ5SDETChIuzHtJoWLlG71jPOGt9mWWoMwlPYL1Kt7NQeotqXfr7rypUAp3LQz678DpRjfO/4ne1mDb4gE9ItPh/Dc6kRg27qu15FJNfdbUghuphAiAcORMdeJP4H0bqFJtIwYB71a9B2+RLw9b41gamH3qQoi99Gr39zWfr1MsieS0yclSPVhOQvJ/0FGSDpqaLkNh+SU1XJn1rE2OQV9YJqFseAWQ6OdNDH02UBCEdEJMNtdnhW2jtBQ=='
	var zelloChannel = 'AASBD Chicago P.A'
	var zelloFilename = fname
	if (!zelloUsername || !zelloPassword || !zelloToken || !zelloChannel || !zelloFilename) {
	    console.error("Invalid config file. See example");
	    process.exit(1);
	}

                console.log(`begin ofs [${fname}]`);
	new OpusFileStream(zelloFilename, function(opusStream) {
	    if (!opusStream) {
		console.error("Failed to start Opus media stream");
		process.exit(1);
	    }
	    zelloStreamReadyCb(opusStream, zelloUsername, zelloPassword, zelloToken, zelloChannel);
	});
	console.log("sleeping");  // TODO: restructure wss loop!
	await sleep(32000);
}
module.exports = lambdaEntry;

