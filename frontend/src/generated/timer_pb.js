/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.tutorial = (function() {

    /**
     * Namespace tutorial.
     * @exports tutorial
     * @namespace
     */
    var tutorial = {};

    tutorial.TimerHealth = (function() {

        /**
         * Properties of a TimerHealth.
         * @memberof tutorial
         * @interface ITimerHealth
         * @property {tutorial.ITimerTimeStamp|null} [stamp] TimerHealth stamp
         * @property {boolean|null} [chronyUsingPps] TimerHealth chronyUsingPps
         * @property {boolean|null} [gpsEmittingPps] TimerHealth gpsEmittingPps
         * @property {number|null} [ramFreeKB] TimerHealth ramFreeKB
         * @property {number|null} [cpuTempC] TimerHealth cpuTempC
         * @property {number|null} [cpuUptime] TimerHealth cpuUptime
         * @property {number|null} [batteryMilliVolts] TimerHealth batteryMilliVolts
         * @property {string|null} [ssid] TimerHealth ssid
         * @property {string|null} [linkQuality] TimerHealth linkQuality
         * @property {string|null} [signalLevel] TimerHealth signalLevel
         * @property {string|null} [wirelessMac] TimerHealth wirelessMac
         * @property {number|null} [wifiRss] TimerHealth wifiRss
         * @property {number|null} [maxPublishAckMs] TimerHealth maxPublishAckMs
         * @property {number|null} [gpsUptime] TimerHealth gpsUptime
         * @property {number|null} [gpsFlutter] TimerHealth gpsFlutter
         * @property {string|null} [wifiIP] TimerHealth wifiIP
         */

        /**
         * Constructs a new TimerHealth.
         * @memberof tutorial
         * @classdesc Represents a TimerHealth.
         * @implements ITimerHealth
         * @constructor
         * @param {tutorial.ITimerHealth=} [properties] Properties to set
         */
        function TimerHealth(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerHealth stamp.
         * @member {tutorial.ITimerTimeStamp|null|undefined} stamp
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.stamp = null;

        /**
         * TimerHealth chronyUsingPps.
         * @member {boolean} chronyUsingPps
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.chronyUsingPps = false;

        /**
         * TimerHealth gpsEmittingPps.
         * @member {boolean} gpsEmittingPps
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.gpsEmittingPps = false;

        /**
         * TimerHealth ramFreeKB.
         * @member {number} ramFreeKB
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.ramFreeKB = 0;

        /**
         * TimerHealth cpuTempC.
         * @member {number} cpuTempC
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.cpuTempC = 0;

        /**
         * TimerHealth cpuUptime.
         * @member {number} cpuUptime
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.cpuUptime = 0;

        /**
         * TimerHealth batteryMilliVolts.
         * @member {number} batteryMilliVolts
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.batteryMilliVolts = 0;

        /**
         * TimerHealth ssid.
         * @member {string} ssid
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.ssid = "";

        /**
         * TimerHealth linkQuality.
         * @member {string} linkQuality
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.linkQuality = "";

        /**
         * TimerHealth signalLevel.
         * @member {string} signalLevel
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.signalLevel = "";

        /**
         * TimerHealth wirelessMac.
         * @member {string} wirelessMac
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.wirelessMac = "";

        /**
         * TimerHealth wifiRss.
         * @member {number} wifiRss
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.wifiRss = 0;

        /**
         * TimerHealth maxPublishAckMs.
         * @member {number} maxPublishAckMs
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.maxPublishAckMs = 0;

        /**
         * TimerHealth gpsUptime.
         * @member {number} gpsUptime
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.gpsUptime = 0;

        /**
         * TimerHealth gpsFlutter.
         * @member {number} gpsFlutter
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.gpsFlutter = 0;

        /**
         * TimerHealth wifiIP.
         * @member {string} wifiIP
         * @memberof tutorial.TimerHealth
         * @instance
         */
        TimerHealth.prototype.wifiIP = "";

        /**
         * Creates a new TimerHealth instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerHealth
         * @static
         * @param {tutorial.ITimerHealth=} [properties] Properties to set
         * @returns {tutorial.TimerHealth} TimerHealth instance
         */
        TimerHealth.create = function create(properties) {
            return new TimerHealth(properties);
        };

        /**
         * Encodes the specified TimerHealth message. Does not implicitly {@link tutorial.TimerHealth.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerHealth
         * @static
         * @param {tutorial.ITimerHealth} message TimerHealth message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerHealth.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.stamp != null && Object.hasOwnProperty.call(message, "stamp"))
                $root.tutorial.TimerTimeStamp.encode(message.stamp, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.chronyUsingPps != null && Object.hasOwnProperty.call(message, "chronyUsingPps"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.chronyUsingPps);
            if (message.gpsEmittingPps != null && Object.hasOwnProperty.call(message, "gpsEmittingPps"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.gpsEmittingPps);
            if (message.ramFreeKB != null && Object.hasOwnProperty.call(message, "ramFreeKB"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.ramFreeKB);
            if (message.cpuTempC != null && Object.hasOwnProperty.call(message, "cpuTempC"))
                writer.uint32(/* id 5, wireType 5 =*/45).float(message.cpuTempC);
            if (message.cpuUptime != null && Object.hasOwnProperty.call(message, "cpuUptime"))
                writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.cpuUptime);
            if (message.batteryMilliVolts != null && Object.hasOwnProperty.call(message, "batteryMilliVolts"))
                writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.batteryMilliVolts);
            if (message.ssid != null && Object.hasOwnProperty.call(message, "ssid"))
                writer.uint32(/* id 8, wireType 2 =*/66).string(message.ssid);
            if (message.linkQuality != null && Object.hasOwnProperty.call(message, "linkQuality"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.linkQuality);
            if (message.signalLevel != null && Object.hasOwnProperty.call(message, "signalLevel"))
                writer.uint32(/* id 10, wireType 2 =*/82).string(message.signalLevel);
            if (message.wirelessMac != null && Object.hasOwnProperty.call(message, "wirelessMac"))
                writer.uint32(/* id 11, wireType 2 =*/90).string(message.wirelessMac);
            if (message.wifiRss != null && Object.hasOwnProperty.call(message, "wifiRss"))
                writer.uint32(/* id 12, wireType 5 =*/101).float(message.wifiRss);
            if (message.maxPublishAckMs != null && Object.hasOwnProperty.call(message, "maxPublishAckMs"))
                writer.uint32(/* id 13, wireType 0 =*/104).uint32(message.maxPublishAckMs);
            if (message.gpsUptime != null && Object.hasOwnProperty.call(message, "gpsUptime"))
                writer.uint32(/* id 14, wireType 0 =*/112).uint32(message.gpsUptime);
            if (message.gpsFlutter != null && Object.hasOwnProperty.call(message, "gpsFlutter"))
                writer.uint32(/* id 15, wireType 0 =*/120).uint32(message.gpsFlutter);
            if (message.wifiIP != null && Object.hasOwnProperty.call(message, "wifiIP"))
                writer.uint32(/* id 16, wireType 2 =*/130).string(message.wifiIP);
            return writer;
        };

        /**
         * Encodes the specified TimerHealth message, length delimited. Does not implicitly {@link tutorial.TimerHealth.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerHealth
         * @static
         * @param {tutorial.ITimerHealth} message TimerHealth message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerHealth.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerHealth message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerHealth
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerHealth} TimerHealth
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerHealth.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerHealth();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.stamp = $root.tutorial.TimerTimeStamp.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.chronyUsingPps = reader.bool();
                        break;
                    }
                case 3: {
                        message.gpsEmittingPps = reader.bool();
                        break;
                    }
                case 4: {
                        message.ramFreeKB = reader.uint32();
                        break;
                    }
                case 5: {
                        message.cpuTempC = reader.float();
                        break;
                    }
                case 6: {
                        message.cpuUptime = reader.uint32();
                        break;
                    }
                case 7: {
                        message.batteryMilliVolts = reader.uint32();
                        break;
                    }
                case 8: {
                        message.ssid = reader.string();
                        break;
                    }
                case 9: {
                        message.linkQuality = reader.string();
                        break;
                    }
                case 10: {
                        message.signalLevel = reader.string();
                        break;
                    }
                case 11: {
                        message.wirelessMac = reader.string();
                        break;
                    }
                case 12: {
                        message.wifiRss = reader.float();
                        break;
                    }
                case 13: {
                        message.maxPublishAckMs = reader.uint32();
                        break;
                    }
                case 14: {
                        message.gpsUptime = reader.uint32();
                        break;
                    }
                case 15: {
                        message.gpsFlutter = reader.uint32();
                        break;
                    }
                case 16: {
                        message.wifiIP = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerHealth message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerHealth
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerHealth} TimerHealth
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerHealth.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerHealth message.
         * @function verify
         * @memberof tutorial.TimerHealth
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerHealth.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.stamp != null && message.hasOwnProperty("stamp")) {
                var error = $root.tutorial.TimerTimeStamp.verify(message.stamp);
                if (error)
                    return "stamp." + error;
            }
            if (message.chronyUsingPps != null && message.hasOwnProperty("chronyUsingPps"))
                if (typeof message.chronyUsingPps !== "boolean")
                    return "chronyUsingPps: boolean expected";
            if (message.gpsEmittingPps != null && message.hasOwnProperty("gpsEmittingPps"))
                if (typeof message.gpsEmittingPps !== "boolean")
                    return "gpsEmittingPps: boolean expected";
            if (message.ramFreeKB != null && message.hasOwnProperty("ramFreeKB"))
                if (!$util.isInteger(message.ramFreeKB))
                    return "ramFreeKB: integer expected";
            if (message.cpuTempC != null && message.hasOwnProperty("cpuTempC"))
                if (typeof message.cpuTempC !== "number")
                    return "cpuTempC: number expected";
            if (message.cpuUptime != null && message.hasOwnProperty("cpuUptime"))
                if (!$util.isInteger(message.cpuUptime))
                    return "cpuUptime: integer expected";
            if (message.batteryMilliVolts != null && message.hasOwnProperty("batteryMilliVolts"))
                if (!$util.isInteger(message.batteryMilliVolts))
                    return "batteryMilliVolts: integer expected";
            if (message.ssid != null && message.hasOwnProperty("ssid"))
                if (!$util.isString(message.ssid))
                    return "ssid: string expected";
            if (message.linkQuality != null && message.hasOwnProperty("linkQuality"))
                if (!$util.isString(message.linkQuality))
                    return "linkQuality: string expected";
            if (message.signalLevel != null && message.hasOwnProperty("signalLevel"))
                if (!$util.isString(message.signalLevel))
                    return "signalLevel: string expected";
            if (message.wirelessMac != null && message.hasOwnProperty("wirelessMac"))
                if (!$util.isString(message.wirelessMac))
                    return "wirelessMac: string expected";
            if (message.wifiRss != null && message.hasOwnProperty("wifiRss"))
                if (typeof message.wifiRss !== "number")
                    return "wifiRss: number expected";
            if (message.maxPublishAckMs != null && message.hasOwnProperty("maxPublishAckMs"))
                if (!$util.isInteger(message.maxPublishAckMs))
                    return "maxPublishAckMs: integer expected";
            if (message.gpsUptime != null && message.hasOwnProperty("gpsUptime"))
                if (!$util.isInteger(message.gpsUptime))
                    return "gpsUptime: integer expected";
            if (message.gpsFlutter != null && message.hasOwnProperty("gpsFlutter"))
                if (!$util.isInteger(message.gpsFlutter))
                    return "gpsFlutter: integer expected";
            if (message.wifiIP != null && message.hasOwnProperty("wifiIP"))
                if (!$util.isString(message.wifiIP))
                    return "wifiIP: string expected";
            return null;
        };

        /**
         * Creates a TimerHealth message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerHealth
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerHealth} TimerHealth
         */
        TimerHealth.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerHealth)
                return object;
            var message = new $root.tutorial.TimerHealth();
            if (object.stamp != null) {
                if (typeof object.stamp !== "object")
                    throw TypeError(".tutorial.TimerHealth.stamp: object expected");
                message.stamp = $root.tutorial.TimerTimeStamp.fromObject(object.stamp);
            }
            if (object.chronyUsingPps != null)
                message.chronyUsingPps = Boolean(object.chronyUsingPps);
            if (object.gpsEmittingPps != null)
                message.gpsEmittingPps = Boolean(object.gpsEmittingPps);
            if (object.ramFreeKB != null)
                message.ramFreeKB = object.ramFreeKB >>> 0;
            if (object.cpuTempC != null)
                message.cpuTempC = Number(object.cpuTempC);
            if (object.cpuUptime != null)
                message.cpuUptime = object.cpuUptime >>> 0;
            if (object.batteryMilliVolts != null)
                message.batteryMilliVolts = object.batteryMilliVolts >>> 0;
            if (object.ssid != null)
                message.ssid = String(object.ssid);
            if (object.linkQuality != null)
                message.linkQuality = String(object.linkQuality);
            if (object.signalLevel != null)
                message.signalLevel = String(object.signalLevel);
            if (object.wirelessMac != null)
                message.wirelessMac = String(object.wirelessMac);
            if (object.wifiRss != null)
                message.wifiRss = Number(object.wifiRss);
            if (object.maxPublishAckMs != null)
                message.maxPublishAckMs = object.maxPublishAckMs >>> 0;
            if (object.gpsUptime != null)
                message.gpsUptime = object.gpsUptime >>> 0;
            if (object.gpsFlutter != null)
                message.gpsFlutter = object.gpsFlutter >>> 0;
            if (object.wifiIP != null)
                message.wifiIP = String(object.wifiIP);
            return message;
        };

        /**
         * Creates a plain object from a TimerHealth message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerHealth
         * @static
         * @param {tutorial.TimerHealth} message TimerHealth
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerHealth.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.stamp = null;
                object.chronyUsingPps = false;
                object.gpsEmittingPps = false;
                object.ramFreeKB = 0;
                object.cpuTempC = 0;
                object.cpuUptime = 0;
                object.batteryMilliVolts = 0;
                object.ssid = "";
                object.linkQuality = "";
                object.signalLevel = "";
                object.wirelessMac = "";
                object.wifiRss = 0;
                object.maxPublishAckMs = 0;
                object.gpsUptime = 0;
                object.gpsFlutter = 0;
                object.wifiIP = "";
            }
            if (message.stamp != null && message.hasOwnProperty("stamp"))
                object.stamp = $root.tutorial.TimerTimeStamp.toObject(message.stamp, options);
            if (message.chronyUsingPps != null && message.hasOwnProperty("chronyUsingPps"))
                object.chronyUsingPps = message.chronyUsingPps;
            if (message.gpsEmittingPps != null && message.hasOwnProperty("gpsEmittingPps"))
                object.gpsEmittingPps = message.gpsEmittingPps;
            if (message.ramFreeKB != null && message.hasOwnProperty("ramFreeKB"))
                object.ramFreeKB = message.ramFreeKB;
            if (message.cpuTempC != null && message.hasOwnProperty("cpuTempC"))
                object.cpuTempC = options.json && !isFinite(message.cpuTempC) ? String(message.cpuTempC) : message.cpuTempC;
            if (message.cpuUptime != null && message.hasOwnProperty("cpuUptime"))
                object.cpuUptime = message.cpuUptime;
            if (message.batteryMilliVolts != null && message.hasOwnProperty("batteryMilliVolts"))
                object.batteryMilliVolts = message.batteryMilliVolts;
            if (message.ssid != null && message.hasOwnProperty("ssid"))
                object.ssid = message.ssid;
            if (message.linkQuality != null && message.hasOwnProperty("linkQuality"))
                object.linkQuality = message.linkQuality;
            if (message.signalLevel != null && message.hasOwnProperty("signalLevel"))
                object.signalLevel = message.signalLevel;
            if (message.wirelessMac != null && message.hasOwnProperty("wirelessMac"))
                object.wirelessMac = message.wirelessMac;
            if (message.wifiRss != null && message.hasOwnProperty("wifiRss"))
                object.wifiRss = options.json && !isFinite(message.wifiRss) ? String(message.wifiRss) : message.wifiRss;
            if (message.maxPublishAckMs != null && message.hasOwnProperty("maxPublishAckMs"))
                object.maxPublishAckMs = message.maxPublishAckMs;
            if (message.gpsUptime != null && message.hasOwnProperty("gpsUptime"))
                object.gpsUptime = message.gpsUptime;
            if (message.gpsFlutter != null && message.hasOwnProperty("gpsFlutter"))
                object.gpsFlutter = message.gpsFlutter;
            if (message.wifiIP != null && message.hasOwnProperty("wifiIP"))
                object.wifiIP = message.wifiIP;
            return object;
        };

        /**
         * Converts this TimerHealth to JSON.
         * @function toJSON
         * @memberof tutorial.TimerHealth
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerHealth.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerHealth
         * @function getTypeUrl
         * @memberof tutorial.TimerHealth
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerHealth.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerHealth";
        };

        return TimerHealth;
    })();

    tutorial.TimerPulse = (function() {

        /**
         * Properties of a TimerPulse.
         * @memberof tutorial
         * @interface ITimerPulse
         * @property {number|null} [pinNumber] TimerPulse pinNumber
         * @property {tutorial.ITimerTimeStamp|null} [stamp] TimerPulse stamp
         * @property {tutorial.PinState|null} [lane1] TimerPulse lane1
         * @property {tutorial.PinState|null} [lane2] TimerPulse lane2
         * @property {tutorial.PinName|null} [pinName] TimerPulse pinName
         */

        /**
         * Constructs a new TimerPulse.
         * @memberof tutorial
         * @classdesc Represents a TimerPulse.
         * @implements ITimerPulse
         * @constructor
         * @param {tutorial.ITimerPulse=} [properties] Properties to set
         */
        function TimerPulse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerPulse pinNumber.
         * @member {number} pinNumber
         * @memberof tutorial.TimerPulse
         * @instance
         */
        TimerPulse.prototype.pinNumber = 0;

        /**
         * TimerPulse stamp.
         * @member {tutorial.ITimerTimeStamp|null|undefined} stamp
         * @memberof tutorial.TimerPulse
         * @instance
         */
        TimerPulse.prototype.stamp = null;

        /**
         * TimerPulse lane1.
         * @member {tutorial.PinState} lane1
         * @memberof tutorial.TimerPulse
         * @instance
         */
        TimerPulse.prototype.lane1 = 0;

        /**
         * TimerPulse lane2.
         * @member {tutorial.PinState} lane2
         * @memberof tutorial.TimerPulse
         * @instance
         */
        TimerPulse.prototype.lane2 = 0;

        /**
         * TimerPulse pinName.
         * @member {tutorial.PinName} pinName
         * @memberof tutorial.TimerPulse
         * @instance
         */
        TimerPulse.prototype.pinName = 1;

        /**
         * Creates a new TimerPulse instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerPulse
         * @static
         * @param {tutorial.ITimerPulse=} [properties] Properties to set
         * @returns {tutorial.TimerPulse} TimerPulse instance
         */
        TimerPulse.create = function create(properties) {
            return new TimerPulse(properties);
        };

        /**
         * Encodes the specified TimerPulse message. Does not implicitly {@link tutorial.TimerPulse.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerPulse
         * @static
         * @param {tutorial.ITimerPulse} message TimerPulse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerPulse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.pinNumber != null && Object.hasOwnProperty.call(message, "pinNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.pinNumber);
            if (message.stamp != null && Object.hasOwnProperty.call(message, "stamp"))
                $root.tutorial.TimerTimeStamp.encode(message.stamp, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.lane1 != null && Object.hasOwnProperty.call(message, "lane1"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.lane1);
            if (message.lane2 != null && Object.hasOwnProperty.call(message, "lane2"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.lane2);
            if (message.pinName != null && Object.hasOwnProperty.call(message, "pinName"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.pinName);
            return writer;
        };

        /**
         * Encodes the specified TimerPulse message, length delimited. Does not implicitly {@link tutorial.TimerPulse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerPulse
         * @static
         * @param {tutorial.ITimerPulse} message TimerPulse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerPulse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerPulse message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerPulse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerPulse} TimerPulse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerPulse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerPulse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.pinNumber = reader.uint32();
                        break;
                    }
                case 2: {
                        message.stamp = $root.tutorial.TimerTimeStamp.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.lane1 = reader.int32();
                        break;
                    }
                case 4: {
                        message.lane2 = reader.int32();
                        break;
                    }
                case 5: {
                        message.pinName = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerPulse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerPulse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerPulse} TimerPulse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerPulse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerPulse message.
         * @function verify
         * @memberof tutorial.TimerPulse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerPulse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.pinNumber != null && message.hasOwnProperty("pinNumber"))
                if (!$util.isInteger(message.pinNumber))
                    return "pinNumber: integer expected";
            if (message.stamp != null && message.hasOwnProperty("stamp")) {
                var error = $root.tutorial.TimerTimeStamp.verify(message.stamp);
                if (error)
                    return "stamp." + error;
            }
            if (message.lane1 != null && message.hasOwnProperty("lane1"))
                switch (message.lane1) {
                default:
                    return "lane1: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.lane2 != null && message.hasOwnProperty("lane2"))
                switch (message.lane2) {
                default:
                    return "lane2: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                switch (message.pinName) {
                default:
                    return "pinName: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 9:
                    break;
                }
            return null;
        };

        /**
         * Creates a TimerPulse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerPulse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerPulse} TimerPulse
         */
        TimerPulse.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerPulse)
                return object;
            var message = new $root.tutorial.TimerPulse();
            if (object.pinNumber != null)
                message.pinNumber = object.pinNumber >>> 0;
            if (object.stamp != null) {
                if (typeof object.stamp !== "object")
                    throw TypeError(".tutorial.TimerPulse.stamp: object expected");
                message.stamp = $root.tutorial.TimerTimeStamp.fromObject(object.stamp);
            }
            switch (object.lane1) {
            default:
                if (typeof object.lane1 === "number") {
                    message.lane1 = object.lane1;
                    break;
                }
                break;
            case "CLEAR":
            case 0:
                message.lane1 = 0;
                break;
            case "BLOCKED":
            case 1:
                message.lane1 = 1;
                break;
            case "UNKNOWN_STATE":
            case 2:
                message.lane1 = 2;
                break;
            }
            switch (object.lane2) {
            default:
                if (typeof object.lane2 === "number") {
                    message.lane2 = object.lane2;
                    break;
                }
                break;
            case "CLEAR":
            case 0:
                message.lane2 = 0;
                break;
            case "BLOCKED":
            case 1:
                message.lane2 = 1;
                break;
            case "UNKNOWN_STATE":
            case 2:
                message.lane2 = 2;
                break;
            }
            switch (object.pinName) {
            default:
                if (typeof object.pinName === "number") {
                    message.pinName = object.pinName;
                    break;
                }
                break;
            case "lane1":
            case 1:
                message.pinName = 1;
                break;
            case "lane2":
            case 2:
                message.pinName = 2;
                break;
            case "gpsHz":
            case 3:
                message.pinName = 3;
                break;
            case "oneHz":
            case 4:
                message.pinName = 4;
                break;
            case "UNKNOWN_PIN":
            case 9:
                message.pinName = 9;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerPulse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerPulse
         * @static
         * @param {tutorial.TimerPulse} message TimerPulse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerPulse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.pinNumber = 0;
                object.stamp = null;
                object.lane1 = options.enums === String ? "CLEAR" : 0;
                object.lane2 = options.enums === String ? "CLEAR" : 0;
                object.pinName = options.enums === String ? "lane1" : 1;
            }
            if (message.pinNumber != null && message.hasOwnProperty("pinNumber"))
                object.pinNumber = message.pinNumber;
            if (message.stamp != null && message.hasOwnProperty("stamp"))
                object.stamp = $root.tutorial.TimerTimeStamp.toObject(message.stamp, options);
            if (message.lane1 != null && message.hasOwnProperty("lane1"))
                object.lane1 = options.enums === String ? $root.tutorial.PinState[message.lane1] === undefined ? message.lane1 : $root.tutorial.PinState[message.lane1] : message.lane1;
            if (message.lane2 != null && message.hasOwnProperty("lane2"))
                object.lane2 = options.enums === String ? $root.tutorial.PinState[message.lane2] === undefined ? message.lane2 : $root.tutorial.PinState[message.lane2] : message.lane2;
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                object.pinName = options.enums === String ? $root.tutorial.PinName[message.pinName] === undefined ? message.pinName : $root.tutorial.PinName[message.pinName] : message.pinName;
            return object;
        };

        /**
         * Converts this TimerPulse to JSON.
         * @function toJSON
         * @memberof tutorial.TimerPulse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerPulse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerPulse
         * @function getTypeUrl
         * @memberof tutorial.TimerPulse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerPulse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerPulse";
        };

        return TimerPulse;
    })();

    /**
     * PinState enum.
     * @name tutorial.PinState
     * @enum {number}
     * @property {number} CLEAR=0 CLEAR value
     * @property {number} BLOCKED=1 BLOCKED value
     * @property {number} UNKNOWN_STATE=2 UNKNOWN_STATE value
     */
    tutorial.PinState = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "CLEAR"] = 0;
        values[valuesById[1] = "BLOCKED"] = 1;
        values[valuesById[2] = "UNKNOWN_STATE"] = 2;
        return values;
    })();

    /**
     * PinName enum.
     * @name tutorial.PinName
     * @enum {number}
     * @property {number} lane1=1 lane1 value
     * @property {number} lane2=2 lane2 value
     * @property {number} gpsHz=3 gpsHz value
     * @property {number} oneHz=4 oneHz value
     * @property {number} UNKNOWN_PIN=9 UNKNOWN_PIN value
     */
    tutorial.PinName = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[1] = "lane1"] = 1;
        values[valuesById[2] = "lane2"] = 2;
        values[valuesById[3] = "gpsHz"] = 3;
        values[valuesById[4] = "oneHz"] = 4;
        values[valuesById[9] = "UNKNOWN_PIN"] = 9;
        return values;
    })();

    tutorial.TimerPin = (function() {

        /**
         * Properties of a TimerPin.
         * @memberof tutorial
         * @interface ITimerPin
         * @property {number|null} [pinNumber] TimerPin pinNumber
         * @property {tutorial.ITimerTimeStamp|null} [stamp] TimerPin stamp
         * @property {tutorial.PinState|null} [pinState] TimerPin pinState
         * @property {tutorial.PinName|null} [pinName] TimerPin pinName
         */

        /**
         * Constructs a new TimerPin.
         * @memberof tutorial
         * @classdesc Represents a TimerPin.
         * @implements ITimerPin
         * @constructor
         * @param {tutorial.ITimerPin=} [properties] Properties to set
         */
        function TimerPin(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerPin pinNumber.
         * @member {number} pinNumber
         * @memberof tutorial.TimerPin
         * @instance
         */
        TimerPin.prototype.pinNumber = 0;

        /**
         * TimerPin stamp.
         * @member {tutorial.ITimerTimeStamp|null|undefined} stamp
         * @memberof tutorial.TimerPin
         * @instance
         */
        TimerPin.prototype.stamp = null;

        /**
         * TimerPin pinState.
         * @member {tutorial.PinState} pinState
         * @memberof tutorial.TimerPin
         * @instance
         */
        TimerPin.prototype.pinState = 0;

        /**
         * TimerPin pinName.
         * @member {tutorial.PinName} pinName
         * @memberof tutorial.TimerPin
         * @instance
         */
        TimerPin.prototype.pinName = 1;

        /**
         * Creates a new TimerPin instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerPin
         * @static
         * @param {tutorial.ITimerPin=} [properties] Properties to set
         * @returns {tutorial.TimerPin} TimerPin instance
         */
        TimerPin.create = function create(properties) {
            return new TimerPin(properties);
        };

        /**
         * Encodes the specified TimerPin message. Does not implicitly {@link tutorial.TimerPin.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerPin
         * @static
         * @param {tutorial.ITimerPin} message TimerPin message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerPin.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.pinNumber != null && Object.hasOwnProperty.call(message, "pinNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.pinNumber);
            if (message.stamp != null && Object.hasOwnProperty.call(message, "stamp"))
                $root.tutorial.TimerTimeStamp.encode(message.stamp, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.pinState != null && Object.hasOwnProperty.call(message, "pinState"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.pinState);
            if (message.pinName != null && Object.hasOwnProperty.call(message, "pinName"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.pinName);
            return writer;
        };

        /**
         * Encodes the specified TimerPin message, length delimited. Does not implicitly {@link tutorial.TimerPin.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerPin
         * @static
         * @param {tutorial.ITimerPin} message TimerPin message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerPin.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerPin message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerPin
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerPin} TimerPin
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerPin.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerPin();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.pinNumber = reader.int32();
                        break;
                    }
                case 2: {
                        message.stamp = $root.tutorial.TimerTimeStamp.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.pinState = reader.int32();
                        break;
                    }
                case 4: {
                        message.pinName = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerPin message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerPin
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerPin} TimerPin
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerPin.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerPin message.
         * @function verify
         * @memberof tutorial.TimerPin
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerPin.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.pinNumber != null && message.hasOwnProperty("pinNumber"))
                if (!$util.isInteger(message.pinNumber))
                    return "pinNumber: integer expected";
            if (message.stamp != null && message.hasOwnProperty("stamp")) {
                var error = $root.tutorial.TimerTimeStamp.verify(message.stamp);
                if (error)
                    return "stamp." + error;
            }
            if (message.pinState != null && message.hasOwnProperty("pinState"))
                switch (message.pinState) {
                default:
                    return "pinState: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                switch (message.pinName) {
                default:
                    return "pinName: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 9:
                    break;
                }
            return null;
        };

        /**
         * Creates a TimerPin message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerPin
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerPin} TimerPin
         */
        TimerPin.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerPin)
                return object;
            var message = new $root.tutorial.TimerPin();
            if (object.pinNumber != null)
                message.pinNumber = object.pinNumber | 0;
            if (object.stamp != null) {
                if (typeof object.stamp !== "object")
                    throw TypeError(".tutorial.TimerPin.stamp: object expected");
                message.stamp = $root.tutorial.TimerTimeStamp.fromObject(object.stamp);
            }
            switch (object.pinState) {
            default:
                if (typeof object.pinState === "number") {
                    message.pinState = object.pinState;
                    break;
                }
                break;
            case "CLEAR":
            case 0:
                message.pinState = 0;
                break;
            case "BLOCKED":
            case 1:
                message.pinState = 1;
                break;
            case "UNKNOWN_STATE":
            case 2:
                message.pinState = 2;
                break;
            }
            switch (object.pinName) {
            default:
                if (typeof object.pinName === "number") {
                    message.pinName = object.pinName;
                    break;
                }
                break;
            case "lane1":
            case 1:
                message.pinName = 1;
                break;
            case "lane2":
            case 2:
                message.pinName = 2;
                break;
            case "gpsHz":
            case 3:
                message.pinName = 3;
                break;
            case "oneHz":
            case 4:
                message.pinName = 4;
                break;
            case "UNKNOWN_PIN":
            case 9:
                message.pinName = 9;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerPin message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerPin
         * @static
         * @param {tutorial.TimerPin} message TimerPin
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerPin.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.pinNumber = 0;
                object.stamp = null;
                object.pinState = options.enums === String ? "CLEAR" : 0;
                object.pinName = options.enums === String ? "lane1" : 1;
            }
            if (message.pinNumber != null && message.hasOwnProperty("pinNumber"))
                object.pinNumber = message.pinNumber;
            if (message.stamp != null && message.hasOwnProperty("stamp"))
                object.stamp = $root.tutorial.TimerTimeStamp.toObject(message.stamp, options);
            if (message.pinState != null && message.hasOwnProperty("pinState"))
                object.pinState = options.enums === String ? $root.tutorial.PinState[message.pinState] === undefined ? message.pinState : $root.tutorial.PinState[message.pinState] : message.pinState;
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                object.pinName = options.enums === String ? $root.tutorial.PinName[message.pinName] === undefined ? message.pinName : $root.tutorial.PinName[message.pinName] : message.pinName;
            return object;
        };

        /**
         * Converts this TimerPin to JSON.
         * @function toJSON
         * @memberof tutorial.TimerPin
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerPin.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerPin
         * @function getTypeUrl
         * @memberof tutorial.TimerPin
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerPin.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerPin";
        };

        return TimerPin;
    })();

    tutorial.TimerTimeStamp = (function() {

        /**
         * Properties of a TimerTimeStamp.
         * @memberof tutorial
         * @interface ITimerTimeStamp
         * @property {number|null} [tick32] TimerTimeStamp tick32
         * @property {google.protobuf.ITimestamp|null} [gpsTime] TimerTimeStamp gpsTime
         * @property {Long|null} [tick64] TimerTimeStamp tick64
         */

        /**
         * Constructs a new TimerTimeStamp.
         * @memberof tutorial
         * @classdesc Represents a TimerTimeStamp.
         * @implements ITimerTimeStamp
         * @constructor
         * @param {tutorial.ITimerTimeStamp=} [properties] Properties to set
         */
        function TimerTimeStamp(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerTimeStamp tick32.
         * @member {number} tick32
         * @memberof tutorial.TimerTimeStamp
         * @instance
         */
        TimerTimeStamp.prototype.tick32 = 0;

        /**
         * TimerTimeStamp gpsTime.
         * @member {google.protobuf.ITimestamp|null|undefined} gpsTime
         * @memberof tutorial.TimerTimeStamp
         * @instance
         */
        TimerTimeStamp.prototype.gpsTime = null;

        /**
         * TimerTimeStamp tick64.
         * @member {Long} tick64
         * @memberof tutorial.TimerTimeStamp
         * @instance
         */
        TimerTimeStamp.prototype.tick64 = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new TimerTimeStamp instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {tutorial.ITimerTimeStamp=} [properties] Properties to set
         * @returns {tutorial.TimerTimeStamp} TimerTimeStamp instance
         */
        TimerTimeStamp.create = function create(properties) {
            return new TimerTimeStamp(properties);
        };

        /**
         * Encodes the specified TimerTimeStamp message. Does not implicitly {@link tutorial.TimerTimeStamp.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {tutorial.ITimerTimeStamp} message TimerTimeStamp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerTimeStamp.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.tick32 != null && Object.hasOwnProperty.call(message, "tick32"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.tick32);
            if (message.gpsTime != null && Object.hasOwnProperty.call(message, "gpsTime"))
                $root.google.protobuf.Timestamp.encode(message.gpsTime, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.tick64 != null && Object.hasOwnProperty.call(message, "tick64"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.tick64);
            return writer;
        };

        /**
         * Encodes the specified TimerTimeStamp message, length delimited. Does not implicitly {@link tutorial.TimerTimeStamp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {tutorial.ITimerTimeStamp} message TimerTimeStamp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerTimeStamp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerTimeStamp message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerTimeStamp} TimerTimeStamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerTimeStamp.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerTimeStamp();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.tick32 = reader.uint32();
                        break;
                    }
                case 3: {
                        message.gpsTime = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.tick64 = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerTimeStamp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerTimeStamp} TimerTimeStamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerTimeStamp.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerTimeStamp message.
         * @function verify
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerTimeStamp.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.tick32 != null && message.hasOwnProperty("tick32"))
                if (!$util.isInteger(message.tick32))
                    return "tick32: integer expected";
            if (message.gpsTime != null && message.hasOwnProperty("gpsTime")) {
                var error = $root.google.protobuf.Timestamp.verify(message.gpsTime);
                if (error)
                    return "gpsTime." + error;
            }
            if (message.tick64 != null && message.hasOwnProperty("tick64"))
                if (!$util.isInteger(message.tick64) && !(message.tick64 && $util.isInteger(message.tick64.low) && $util.isInteger(message.tick64.high)))
                    return "tick64: integer|Long expected";
            return null;
        };

        /**
         * Creates a TimerTimeStamp message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerTimeStamp} TimerTimeStamp
         */
        TimerTimeStamp.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerTimeStamp)
                return object;
            var message = new $root.tutorial.TimerTimeStamp();
            if (object.tick32 != null)
                message.tick32 = object.tick32 >>> 0;
            if (object.gpsTime != null) {
                if (typeof object.gpsTime !== "object")
                    throw TypeError(".tutorial.TimerTimeStamp.gpsTime: object expected");
                message.gpsTime = $root.google.protobuf.Timestamp.fromObject(object.gpsTime);
            }
            if (object.tick64 != null)
                if ($util.Long)
                    (message.tick64 = $util.Long.fromValue(object.tick64)).unsigned = true;
                else if (typeof object.tick64 === "string")
                    message.tick64 = parseInt(object.tick64, 10);
                else if (typeof object.tick64 === "number")
                    message.tick64 = object.tick64;
                else if (typeof object.tick64 === "object")
                    message.tick64 = new $util.LongBits(object.tick64.low >>> 0, object.tick64.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a TimerTimeStamp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {tutorial.TimerTimeStamp} message TimerTimeStamp
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerTimeStamp.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.tick32 = 0;
                object.gpsTime = null;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.tick64 = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.tick64 = options.longs === String ? "0" : 0;
            }
            if (message.tick32 != null && message.hasOwnProperty("tick32"))
                object.tick32 = message.tick32;
            if (message.gpsTime != null && message.hasOwnProperty("gpsTime"))
                object.gpsTime = $root.google.protobuf.Timestamp.toObject(message.gpsTime, options);
            if (message.tick64 != null && message.hasOwnProperty("tick64"))
                if (typeof message.tick64 === "number")
                    object.tick64 = options.longs === String ? String(message.tick64) : message.tick64;
                else
                    object.tick64 = options.longs === String ? $util.Long.prototype.toString.call(message.tick64) : options.longs === Number ? new $util.LongBits(message.tick64.low >>> 0, message.tick64.high >>> 0).toNumber(true) : message.tick64;
            return object;
        };

        /**
         * Converts this TimerTimeStamp to JSON.
         * @function toJSON
         * @memberof tutorial.TimerTimeStamp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerTimeStamp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerTimeStamp
         * @function getTypeUrl
         * @memberof tutorial.TimerTimeStamp
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerTimeStamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerTimeStamp";
        };

        return TimerTimeStamp;
    })();

    tutorial.TimerData = (function() {

        /**
         * Properties of a TimerData.
         * @memberof tutorial
         * @interface ITimerData
         * @property {tutorial.ITimerPin|null} [timerPin] TimerData timerPin
         * @property {tutorial.ITimerPulse|null} [timerPulse] TimerData timerPulse
         * @property {tutorial.ITimerHealth|null} [timerHealth] TimerData timerHealth
         */

        /**
         * Constructs a new TimerData.
         * @memberof tutorial
         * @classdesc Represents a TimerData.
         * @implements ITimerData
         * @constructor
         * @param {tutorial.ITimerData=} [properties] Properties to set
         */
        function TimerData(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerData timerPin.
         * @member {tutorial.ITimerPin|null|undefined} timerPin
         * @memberof tutorial.TimerData
         * @instance
         */
        TimerData.prototype.timerPin = null;

        /**
         * TimerData timerPulse.
         * @member {tutorial.ITimerPulse|null|undefined} timerPulse
         * @memberof tutorial.TimerData
         * @instance
         */
        TimerData.prototype.timerPulse = null;

        /**
         * TimerData timerHealth.
         * @member {tutorial.ITimerHealth|null|undefined} timerHealth
         * @memberof tutorial.TimerData
         * @instance
         */
        TimerData.prototype.timerHealth = null;

        /**
         * Creates a new TimerData instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerData
         * @static
         * @param {tutorial.ITimerData=} [properties] Properties to set
         * @returns {tutorial.TimerData} TimerData instance
         */
        TimerData.create = function create(properties) {
            return new TimerData(properties);
        };

        /**
         * Encodes the specified TimerData message. Does not implicitly {@link tutorial.TimerData.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerData
         * @static
         * @param {tutorial.ITimerData} message TimerData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timerPin != null && Object.hasOwnProperty.call(message, "timerPin"))
                $root.tutorial.TimerPin.encode(message.timerPin, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.timerPulse != null && Object.hasOwnProperty.call(message, "timerPulse"))
                $root.tutorial.TimerPulse.encode(message.timerPulse, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.timerHealth != null && Object.hasOwnProperty.call(message, "timerHealth"))
                $root.tutorial.TimerHealth.encode(message.timerHealth, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TimerData message, length delimited. Does not implicitly {@link tutorial.TimerData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerData
         * @static
         * @param {tutorial.ITimerData} message TimerData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerData message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerData} TimerData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.timerPin = $root.tutorial.TimerPin.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.timerPulse = $root.tutorial.TimerPulse.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.timerHealth = $root.tutorial.TimerHealth.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerData} TimerData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerData message.
         * @function verify
         * @memberof tutorial.TimerData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timerPin != null && message.hasOwnProperty("timerPin")) {
                var error = $root.tutorial.TimerPin.verify(message.timerPin);
                if (error)
                    return "timerPin." + error;
            }
            if (message.timerPulse != null && message.hasOwnProperty("timerPulse")) {
                var error = $root.tutorial.TimerPulse.verify(message.timerPulse);
                if (error)
                    return "timerPulse." + error;
            }
            if (message.timerHealth != null && message.hasOwnProperty("timerHealth")) {
                var error = $root.tutorial.TimerHealth.verify(message.timerHealth);
                if (error)
                    return "timerHealth." + error;
            }
            return null;
        };

        /**
         * Creates a TimerData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerData} TimerData
         */
        TimerData.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerData)
                return object;
            var message = new $root.tutorial.TimerData();
            if (object.timerPin != null) {
                if (typeof object.timerPin !== "object")
                    throw TypeError(".tutorial.TimerData.timerPin: object expected");
                message.timerPin = $root.tutorial.TimerPin.fromObject(object.timerPin);
            }
            if (object.timerPulse != null) {
                if (typeof object.timerPulse !== "object")
                    throw TypeError(".tutorial.TimerData.timerPulse: object expected");
                message.timerPulse = $root.tutorial.TimerPulse.fromObject(object.timerPulse);
            }
            if (object.timerHealth != null) {
                if (typeof object.timerHealth !== "object")
                    throw TypeError(".tutorial.TimerData.timerHealth: object expected");
                message.timerHealth = $root.tutorial.TimerHealth.fromObject(object.timerHealth);
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerData
         * @static
         * @param {tutorial.TimerData} message TimerData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.timerPin = null;
                object.timerPulse = null;
                object.timerHealth = null;
            }
            if (message.timerPin != null && message.hasOwnProperty("timerPin"))
                object.timerPin = $root.tutorial.TimerPin.toObject(message.timerPin, options);
            if (message.timerPulse != null && message.hasOwnProperty("timerPulse"))
                object.timerPulse = $root.tutorial.TimerPulse.toObject(message.timerPulse, options);
            if (message.timerHealth != null && message.hasOwnProperty("timerHealth"))
                object.timerHealth = $root.tutorial.TimerHealth.toObject(message.timerHealth, options);
            return object;
        };

        /**
         * Converts this TimerData to JSON.
         * @function toJSON
         * @memberof tutorial.TimerData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerData
         * @function getTypeUrl
         * @memberof tutorial.TimerData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerData";
        };

        return TimerData;
    })();

    tutorial.TimerDataList = (function() {

        /**
         * Properties of a TimerDataList.
         * @memberof tutorial
         * @interface ITimerDataList
         * @property {Array.<tutorial.ITimerData>|null} [timerData] TimerDataList timerData
         * @property {google.protobuf.ITimestamp|null} [xmitTime] TimerDataList xmitTime
         * @property {Long|null} [xmitMs] TimerDataList xmitMs
         * @property {Long|null} [prevPubAckMs] TimerDataList prevPubAckMs
         */

        /**
         * Constructs a new TimerDataList.
         * @memberof tutorial
         * @classdesc Represents a TimerDataList.
         * @implements ITimerDataList
         * @constructor
         * @param {tutorial.ITimerDataList=} [properties] Properties to set
         */
        function TimerDataList(properties) {
            this.timerData = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerDataList timerData.
         * @member {Array.<tutorial.ITimerData>} timerData
         * @memberof tutorial.TimerDataList
         * @instance
         */
        TimerDataList.prototype.timerData = $util.emptyArray;

        /**
         * TimerDataList xmitTime.
         * @member {google.protobuf.ITimestamp|null|undefined} xmitTime
         * @memberof tutorial.TimerDataList
         * @instance
         */
        TimerDataList.prototype.xmitTime = null;

        /**
         * TimerDataList xmitMs.
         * @member {Long} xmitMs
         * @memberof tutorial.TimerDataList
         * @instance
         */
        TimerDataList.prototype.xmitMs = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * TimerDataList prevPubAckMs.
         * @member {Long} prevPubAckMs
         * @memberof tutorial.TimerDataList
         * @instance
         */
        TimerDataList.prototype.prevPubAckMs = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new TimerDataList instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerDataList
         * @static
         * @param {tutorial.ITimerDataList=} [properties] Properties to set
         * @returns {tutorial.TimerDataList} TimerDataList instance
         */
        TimerDataList.create = function create(properties) {
            return new TimerDataList(properties);
        };

        /**
         * Encodes the specified TimerDataList message. Does not implicitly {@link tutorial.TimerDataList.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerDataList
         * @static
         * @param {tutorial.ITimerDataList} message TimerDataList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerDataList.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.xmitTime != null && Object.hasOwnProperty.call(message, "xmitTime"))
                $root.google.protobuf.Timestamp.encode(message.xmitTime, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.xmitMs != null && Object.hasOwnProperty.call(message, "xmitMs"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.xmitMs);
            if (message.timerData != null && message.timerData.length)
                for (var i = 0; i < message.timerData.length; ++i)
                    $root.tutorial.TimerData.encode(message.timerData[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.prevPubAckMs != null && Object.hasOwnProperty.call(message, "prevPubAckMs"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.prevPubAckMs);
            return writer;
        };

        /**
         * Encodes the specified TimerDataList message, length delimited. Does not implicitly {@link tutorial.TimerDataList.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerDataList
         * @static
         * @param {tutorial.ITimerDataList} message TimerDataList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerDataList.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerDataList message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerDataList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerDataList} TimerDataList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerDataList.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerDataList();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 3: {
                        if (!(message.timerData && message.timerData.length))
                            message.timerData = [];
                        message.timerData.push($root.tutorial.TimerData.decode(reader, reader.uint32()));
                        break;
                    }
                case 1: {
                        message.xmitTime = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.xmitMs = reader.uint64();
                        break;
                    }
                case 4: {
                        message.prevPubAckMs = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerDataList message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerDataList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerDataList} TimerDataList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerDataList.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerDataList message.
         * @function verify
         * @memberof tutorial.TimerDataList
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerDataList.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timerData != null && message.hasOwnProperty("timerData")) {
                if (!Array.isArray(message.timerData))
                    return "timerData: array expected";
                for (var i = 0; i < message.timerData.length; ++i) {
                    var error = $root.tutorial.TimerData.verify(message.timerData[i]);
                    if (error)
                        return "timerData." + error;
                }
            }
            if (message.xmitTime != null && message.hasOwnProperty("xmitTime")) {
                var error = $root.google.protobuf.Timestamp.verify(message.xmitTime);
                if (error)
                    return "xmitTime." + error;
            }
            if (message.xmitMs != null && message.hasOwnProperty("xmitMs"))
                if (!$util.isInteger(message.xmitMs) && !(message.xmitMs && $util.isInteger(message.xmitMs.low) && $util.isInteger(message.xmitMs.high)))
                    return "xmitMs: integer|Long expected";
            if (message.prevPubAckMs != null && message.hasOwnProperty("prevPubAckMs"))
                if (!$util.isInteger(message.prevPubAckMs) && !(message.prevPubAckMs && $util.isInteger(message.prevPubAckMs.low) && $util.isInteger(message.prevPubAckMs.high)))
                    return "prevPubAckMs: integer|Long expected";
            return null;
        };

        /**
         * Creates a TimerDataList message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerDataList
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerDataList} TimerDataList
         */
        TimerDataList.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerDataList)
                return object;
            var message = new $root.tutorial.TimerDataList();
            if (object.timerData) {
                if (!Array.isArray(object.timerData))
                    throw TypeError(".tutorial.TimerDataList.timerData: array expected");
                message.timerData = [];
                for (var i = 0; i < object.timerData.length; ++i) {
                    if (typeof object.timerData[i] !== "object")
                        throw TypeError(".tutorial.TimerDataList.timerData: object expected");
                    message.timerData[i] = $root.tutorial.TimerData.fromObject(object.timerData[i]);
                }
            }
            if (object.xmitTime != null) {
                if (typeof object.xmitTime !== "object")
                    throw TypeError(".tutorial.TimerDataList.xmitTime: object expected");
                message.xmitTime = $root.google.protobuf.Timestamp.fromObject(object.xmitTime);
            }
            if (object.xmitMs != null)
                if ($util.Long)
                    (message.xmitMs = $util.Long.fromValue(object.xmitMs)).unsigned = true;
                else if (typeof object.xmitMs === "string")
                    message.xmitMs = parseInt(object.xmitMs, 10);
                else if (typeof object.xmitMs === "number")
                    message.xmitMs = object.xmitMs;
                else if (typeof object.xmitMs === "object")
                    message.xmitMs = new $util.LongBits(object.xmitMs.low >>> 0, object.xmitMs.high >>> 0).toNumber(true);
            if (object.prevPubAckMs != null)
                if ($util.Long)
                    (message.prevPubAckMs = $util.Long.fromValue(object.prevPubAckMs)).unsigned = true;
                else if (typeof object.prevPubAckMs === "string")
                    message.prevPubAckMs = parseInt(object.prevPubAckMs, 10);
                else if (typeof object.prevPubAckMs === "number")
                    message.prevPubAckMs = object.prevPubAckMs;
                else if (typeof object.prevPubAckMs === "object")
                    message.prevPubAckMs = new $util.LongBits(object.prevPubAckMs.low >>> 0, object.prevPubAckMs.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a TimerDataList message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerDataList
         * @static
         * @param {tutorial.TimerDataList} message TimerDataList
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerDataList.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.timerData = [];
            if (options.defaults) {
                object.xmitTime = null;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.xmitMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.xmitMs = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.prevPubAckMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.prevPubAckMs = options.longs === String ? "0" : 0;
            }
            if (message.xmitTime != null && message.hasOwnProperty("xmitTime"))
                object.xmitTime = $root.google.protobuf.Timestamp.toObject(message.xmitTime, options);
            if (message.xmitMs != null && message.hasOwnProperty("xmitMs"))
                if (typeof message.xmitMs === "number")
                    object.xmitMs = options.longs === String ? String(message.xmitMs) : message.xmitMs;
                else
                    object.xmitMs = options.longs === String ? $util.Long.prototype.toString.call(message.xmitMs) : options.longs === Number ? new $util.LongBits(message.xmitMs.low >>> 0, message.xmitMs.high >>> 0).toNumber(true) : message.xmitMs;
            if (message.timerData && message.timerData.length) {
                object.timerData = [];
                for (var j = 0; j < message.timerData.length; ++j)
                    object.timerData[j] = $root.tutorial.TimerData.toObject(message.timerData[j], options);
            }
            if (message.prevPubAckMs != null && message.hasOwnProperty("prevPubAckMs"))
                if (typeof message.prevPubAckMs === "number")
                    object.prevPubAckMs = options.longs === String ? String(message.prevPubAckMs) : message.prevPubAckMs;
                else
                    object.prevPubAckMs = options.longs === String ? $util.Long.prototype.toString.call(message.prevPubAckMs) : options.longs === Number ? new $util.LongBits(message.prevPubAckMs.low >>> 0, message.prevPubAckMs.high >>> 0).toNumber(true) : message.prevPubAckMs;
            return object;
        };

        /**
         * Converts this TimerDataList to JSON.
         * @function toJSON
         * @memberof tutorial.TimerDataList
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerDataList.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerDataList
         * @function getTypeUrl
         * @memberof tutorial.TimerDataList
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerDataList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerDataList";
        };

        return TimerDataList;
    })();

    /**
     * SensorLogic enum.
     * @name tutorial.SensorLogic
     * @enum {number}
     * @property {number} LanePhotoEyes=1 LanePhotoEyes value
     * @property {number} OpposedStarterReeds=2 OpposedStarterReeds value
     */
    tutorial.SensorLogic = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[1] = "LanePhotoEyes"] = 1;
        values[valuesById[2] = "OpposedStarterReeds"] = 2;
        return values;
    })();

    tutorial.ElapsedConfig = (function() {

        /**
         * Properties of an ElapsedConfig.
         * @memberof tutorial
         * @interface IElapsedConfig
         * @property {Array.<string>|null} [timerName] ElapsedConfig timerName
         * @property {number|null} [maxTravelMS] ElapsedConfig maxTravelMS
         * @property {number|null} [minTravelMS] ElapsedConfig minTravelMS
         */

        /**
         * Constructs a new ElapsedConfig.
         * @memberof tutorial
         * @classdesc Represents an ElapsedConfig.
         * @implements IElapsedConfig
         * @constructor
         * @param {tutorial.IElapsedConfig=} [properties] Properties to set
         */
        function ElapsedConfig(properties) {
            this.timerName = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ElapsedConfig timerName.
         * @member {Array.<string>} timerName
         * @memberof tutorial.ElapsedConfig
         * @instance
         */
        ElapsedConfig.prototype.timerName = $util.emptyArray;

        /**
         * ElapsedConfig maxTravelMS.
         * @member {number} maxTravelMS
         * @memberof tutorial.ElapsedConfig
         * @instance
         */
        ElapsedConfig.prototype.maxTravelMS = 0;

        /**
         * ElapsedConfig minTravelMS.
         * @member {number} minTravelMS
         * @memberof tutorial.ElapsedConfig
         * @instance
         */
        ElapsedConfig.prototype.minTravelMS = 0;

        /**
         * Creates a new ElapsedConfig instance using the specified properties.
         * @function create
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {tutorial.IElapsedConfig=} [properties] Properties to set
         * @returns {tutorial.ElapsedConfig} ElapsedConfig instance
         */
        ElapsedConfig.create = function create(properties) {
            return new ElapsedConfig(properties);
        };

        /**
         * Encodes the specified ElapsedConfig message. Does not implicitly {@link tutorial.ElapsedConfig.verify|verify} messages.
         * @function encode
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {tutorial.IElapsedConfig} message ElapsedConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ElapsedConfig.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timerName != null && message.timerName.length)
                for (var i = 0; i < message.timerName.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.timerName[i]);
            if (message.maxTravelMS != null && Object.hasOwnProperty.call(message, "maxTravelMS"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.maxTravelMS);
            if (message.minTravelMS != null && Object.hasOwnProperty.call(message, "minTravelMS"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.minTravelMS);
            return writer;
        };

        /**
         * Encodes the specified ElapsedConfig message, length delimited. Does not implicitly {@link tutorial.ElapsedConfig.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {tutorial.IElapsedConfig} message ElapsedConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ElapsedConfig.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ElapsedConfig message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.ElapsedConfig} ElapsedConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ElapsedConfig.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.ElapsedConfig();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.timerName && message.timerName.length))
                            message.timerName = [];
                        message.timerName.push(reader.string());
                        break;
                    }
                case 3: {
                        message.maxTravelMS = reader.uint32();
                        break;
                    }
                case 4: {
                        message.minTravelMS = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an ElapsedConfig message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.ElapsedConfig} ElapsedConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ElapsedConfig.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ElapsedConfig message.
         * @function verify
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ElapsedConfig.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timerName != null && message.hasOwnProperty("timerName")) {
                if (!Array.isArray(message.timerName))
                    return "timerName: array expected";
                for (var i = 0; i < message.timerName.length; ++i)
                    if (!$util.isString(message.timerName[i]))
                        return "timerName: string[] expected";
            }
            if (message.maxTravelMS != null && message.hasOwnProperty("maxTravelMS"))
                if (!$util.isInteger(message.maxTravelMS))
                    return "maxTravelMS: integer expected";
            if (message.minTravelMS != null && message.hasOwnProperty("minTravelMS"))
                if (!$util.isInteger(message.minTravelMS))
                    return "minTravelMS: integer expected";
            return null;
        };

        /**
         * Creates an ElapsedConfig message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.ElapsedConfig} ElapsedConfig
         */
        ElapsedConfig.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.ElapsedConfig)
                return object;
            var message = new $root.tutorial.ElapsedConfig();
            if (object.timerName) {
                if (!Array.isArray(object.timerName))
                    throw TypeError(".tutorial.ElapsedConfig.timerName: array expected");
                message.timerName = [];
                for (var i = 0; i < object.timerName.length; ++i)
                    message.timerName[i] = String(object.timerName[i]);
            }
            if (object.maxTravelMS != null)
                message.maxTravelMS = object.maxTravelMS >>> 0;
            if (object.minTravelMS != null)
                message.minTravelMS = object.minTravelMS >>> 0;
            return message;
        };

        /**
         * Creates a plain object from an ElapsedConfig message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {tutorial.ElapsedConfig} message ElapsedConfig
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ElapsedConfig.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.timerName = [];
            if (options.defaults) {
                object.maxTravelMS = 0;
                object.minTravelMS = 0;
            }
            if (message.timerName && message.timerName.length) {
                object.timerName = [];
                for (var j = 0; j < message.timerName.length; ++j)
                    object.timerName[j] = message.timerName[j];
            }
            if (message.maxTravelMS != null && message.hasOwnProperty("maxTravelMS"))
                object.maxTravelMS = message.maxTravelMS;
            if (message.minTravelMS != null && message.hasOwnProperty("minTravelMS"))
                object.minTravelMS = message.minTravelMS;
            return object;
        };

        /**
         * Converts this ElapsedConfig to JSON.
         * @function toJSON
         * @memberof tutorial.ElapsedConfig
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ElapsedConfig.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ElapsedConfig
         * @function getTypeUrl
         * @memberof tutorial.ElapsedConfig
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ElapsedConfig.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.ElapsedConfig";
        };

        return ElapsedConfig;
    })();

    tutorial.TimerConfig = (function() {

        /**
         * Properties of a TimerConfig.
         * @memberof tutorial
         * @interface ITimerConfig
         * @property {string|null} [timerName] TimerConfig timerName
         * @property {string|null} [timerMqttClientId] TimerConfig timerMqttClientId
         * @property {boolean|null} [useGpsTime] TimerConfig useGpsTime
         * @property {string|null} [orgId] TimerConfig orgId
         * @property {string|null} [orgIz] TimerConfig orgIz
         * @property {tutorial.SensorLogic|null} [sensorLogic] TimerConfig sensorLogic
         * @property {tutorial.ITimerConfigLanePhotoEye|null} [timerConfigLanePhotoEye] TimerConfig timerConfigLanePhotoEye
         * @property {tutorial.ITimerConfigOpposedStarter|null} [timerConfigOpposedStarter] TimerConfig timerConfigOpposedStarter
         * @property {number|null} [maxTrackSeconds] TimerConfig maxTrackSeconds
         * @property {boolean|null} [deleted] TimerConfig deleted
         * @property {number|null} [seq] TimerConfig seq
         */

        /**
         * Constructs a new TimerConfig.
         * @memberof tutorial
         * @classdesc Represents a TimerConfig.
         * @implements ITimerConfig
         * @constructor
         * @param {tutorial.ITimerConfig=} [properties] Properties to set
         */
        function TimerConfig(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerConfig timerName.
         * @member {string} timerName
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.timerName = "";

        /**
         * TimerConfig timerMqttClientId.
         * @member {string} timerMqttClientId
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.timerMqttClientId = "";

        /**
         * TimerConfig useGpsTime.
         * @member {boolean} useGpsTime
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.useGpsTime = false;

        /**
         * TimerConfig orgId.
         * @member {string} orgId
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.orgId = "";

        /**
         * TimerConfig orgIz.
         * @member {string} orgIz
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.orgIz = "";

        /**
         * TimerConfig sensorLogic.
         * @member {tutorial.SensorLogic} sensorLogic
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.sensorLogic = 1;

        /**
         * TimerConfig timerConfigLanePhotoEye.
         * @member {tutorial.ITimerConfigLanePhotoEye|null|undefined} timerConfigLanePhotoEye
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.timerConfigLanePhotoEye = null;

        /**
         * TimerConfig timerConfigOpposedStarter.
         * @member {tutorial.ITimerConfigOpposedStarter|null|undefined} timerConfigOpposedStarter
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.timerConfigOpposedStarter = null;

        /**
         * TimerConfig maxTrackSeconds.
         * @member {number} maxTrackSeconds
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.maxTrackSeconds = 0;

        /**
         * TimerConfig deleted.
         * @member {boolean} deleted
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.deleted = false;

        /**
         * TimerConfig seq.
         * @member {number} seq
         * @memberof tutorial.TimerConfig
         * @instance
         */
        TimerConfig.prototype.seq = 0;

        /**
         * Creates a new TimerConfig instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerConfig
         * @static
         * @param {tutorial.ITimerConfig=} [properties] Properties to set
         * @returns {tutorial.TimerConfig} TimerConfig instance
         */
        TimerConfig.create = function create(properties) {
            return new TimerConfig(properties);
        };

        /**
         * Encodes the specified TimerConfig message. Does not implicitly {@link tutorial.TimerConfig.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerConfig
         * @static
         * @param {tutorial.ITimerConfig} message TimerConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfig.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timerName != null && Object.hasOwnProperty.call(message, "timerName"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.timerName);
            if (message.timerMqttClientId != null && Object.hasOwnProperty.call(message, "timerMqttClientId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.timerMqttClientId);
            if (message.useGpsTime != null && Object.hasOwnProperty.call(message, "useGpsTime"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.useGpsTime);
            if (message.orgId != null && Object.hasOwnProperty.call(message, "orgId"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.orgId);
            if (message.orgIz != null && Object.hasOwnProperty.call(message, "orgIz"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.orgIz);
            if (message.sensorLogic != null && Object.hasOwnProperty.call(message, "sensorLogic"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.sensorLogic);
            if (message.timerConfigLanePhotoEye != null && Object.hasOwnProperty.call(message, "timerConfigLanePhotoEye"))
                $root.tutorial.TimerConfigLanePhotoEye.encode(message.timerConfigLanePhotoEye, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            if (message.timerConfigOpposedStarter != null && Object.hasOwnProperty.call(message, "timerConfigOpposedStarter"))
                $root.tutorial.TimerConfigOpposedStarter.encode(message.timerConfigOpposedStarter, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.maxTrackSeconds != null && Object.hasOwnProperty.call(message, "maxTrackSeconds"))
                writer.uint32(/* id 9, wireType 0 =*/72).uint32(message.maxTrackSeconds);
            if (message.deleted != null && Object.hasOwnProperty.call(message, "deleted"))
                writer.uint32(/* id 10, wireType 0 =*/80).bool(message.deleted);
            if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                writer.uint32(/* id 11, wireType 0 =*/88).uint32(message.seq);
            return writer;
        };

        /**
         * Encodes the specified TimerConfig message, length delimited. Does not implicitly {@link tutorial.TimerConfig.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerConfig
         * @static
         * @param {tutorial.ITimerConfig} message TimerConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfig.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerConfig message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerConfig} TimerConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfig.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerConfig();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.timerName = reader.string();
                        break;
                    }
                case 2: {
                        message.timerMqttClientId = reader.string();
                        break;
                    }
                case 3: {
                        message.useGpsTime = reader.bool();
                        break;
                    }
                case 4: {
                        message.orgId = reader.string();
                        break;
                    }
                case 5: {
                        message.orgIz = reader.string();
                        break;
                    }
                case 6: {
                        message.sensorLogic = reader.int32();
                        break;
                    }
                case 7: {
                        message.timerConfigLanePhotoEye = $root.tutorial.TimerConfigLanePhotoEye.decode(reader, reader.uint32());
                        break;
                    }
                case 8: {
                        message.timerConfigOpposedStarter = $root.tutorial.TimerConfigOpposedStarter.decode(reader, reader.uint32());
                        break;
                    }
                case 9: {
                        message.maxTrackSeconds = reader.uint32();
                        break;
                    }
                case 10: {
                        message.deleted = reader.bool();
                        break;
                    }
                case 11: {
                        message.seq = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerConfig message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerConfig} TimerConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfig.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerConfig message.
         * @function verify
         * @memberof tutorial.TimerConfig
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerConfig.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timerName != null && message.hasOwnProperty("timerName"))
                if (!$util.isString(message.timerName))
                    return "timerName: string expected";
            if (message.timerMqttClientId != null && message.hasOwnProperty("timerMqttClientId"))
                if (!$util.isString(message.timerMqttClientId))
                    return "timerMqttClientId: string expected";
            if (message.useGpsTime != null && message.hasOwnProperty("useGpsTime"))
                if (typeof message.useGpsTime !== "boolean")
                    return "useGpsTime: boolean expected";
            if (message.orgId != null && message.hasOwnProperty("orgId"))
                if (!$util.isString(message.orgId))
                    return "orgId: string expected";
            if (message.orgIz != null && message.hasOwnProperty("orgIz"))
                if (!$util.isString(message.orgIz))
                    return "orgIz: string expected";
            if (message.sensorLogic != null && message.hasOwnProperty("sensorLogic"))
                switch (message.sensorLogic) {
                default:
                    return "sensorLogic: enum value expected";
                case 1:
                case 2:
                    break;
                }
            if (message.timerConfigLanePhotoEye != null && message.hasOwnProperty("timerConfigLanePhotoEye")) {
                var error = $root.tutorial.TimerConfigLanePhotoEye.verify(message.timerConfigLanePhotoEye);
                if (error)
                    return "timerConfigLanePhotoEye." + error;
            }
            if (message.timerConfigOpposedStarter != null && message.hasOwnProperty("timerConfigOpposedStarter")) {
                var error = $root.tutorial.TimerConfigOpposedStarter.verify(message.timerConfigOpposedStarter);
                if (error)
                    return "timerConfigOpposedStarter." + error;
            }
            if (message.maxTrackSeconds != null && message.hasOwnProperty("maxTrackSeconds"))
                if (!$util.isInteger(message.maxTrackSeconds))
                    return "maxTrackSeconds: integer expected";
            if (message.deleted != null && message.hasOwnProperty("deleted"))
                if (typeof message.deleted !== "boolean")
                    return "deleted: boolean expected";
            if (message.seq != null && message.hasOwnProperty("seq"))
                if (!$util.isInteger(message.seq))
                    return "seq: integer expected";
            return null;
        };

        /**
         * Creates a TimerConfig message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerConfig
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerConfig} TimerConfig
         */
        TimerConfig.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerConfig)
                return object;
            var message = new $root.tutorial.TimerConfig();
            if (object.timerName != null)
                message.timerName = String(object.timerName);
            if (object.timerMqttClientId != null)
                message.timerMqttClientId = String(object.timerMqttClientId);
            if (object.useGpsTime != null)
                message.useGpsTime = Boolean(object.useGpsTime);
            if (object.orgId != null)
                message.orgId = String(object.orgId);
            if (object.orgIz != null)
                message.orgIz = String(object.orgIz);
            switch (object.sensorLogic) {
            default:
                if (typeof object.sensorLogic === "number") {
                    message.sensorLogic = object.sensorLogic;
                    break;
                }
                break;
            case "LanePhotoEyes":
            case 1:
                message.sensorLogic = 1;
                break;
            case "OpposedStarterReeds":
            case 2:
                message.sensorLogic = 2;
                break;
            }
            if (object.timerConfigLanePhotoEye != null) {
                if (typeof object.timerConfigLanePhotoEye !== "object")
                    throw TypeError(".tutorial.TimerConfig.timerConfigLanePhotoEye: object expected");
                message.timerConfigLanePhotoEye = $root.tutorial.TimerConfigLanePhotoEye.fromObject(object.timerConfigLanePhotoEye);
            }
            if (object.timerConfigOpposedStarter != null) {
                if (typeof object.timerConfigOpposedStarter !== "object")
                    throw TypeError(".tutorial.TimerConfig.timerConfigOpposedStarter: object expected");
                message.timerConfigOpposedStarter = $root.tutorial.TimerConfigOpposedStarter.fromObject(object.timerConfigOpposedStarter);
            }
            if (object.maxTrackSeconds != null)
                message.maxTrackSeconds = object.maxTrackSeconds >>> 0;
            if (object.deleted != null)
                message.deleted = Boolean(object.deleted);
            if (object.seq != null)
                message.seq = object.seq >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TimerConfig message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerConfig
         * @static
         * @param {tutorial.TimerConfig} message TimerConfig
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerConfig.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.timerName = "";
                object.timerMqttClientId = "";
                object.useGpsTime = false;
                object.orgId = "";
                object.orgIz = "";
                object.sensorLogic = options.enums === String ? "LanePhotoEyes" : 1;
                object.timerConfigLanePhotoEye = null;
                object.timerConfigOpposedStarter = null;
                object.maxTrackSeconds = 0;
                object.deleted = false;
                object.seq = 0;
            }
            if (message.timerName != null && message.hasOwnProperty("timerName"))
                object.timerName = message.timerName;
            if (message.timerMqttClientId != null && message.hasOwnProperty("timerMqttClientId"))
                object.timerMqttClientId = message.timerMqttClientId;
            if (message.useGpsTime != null && message.hasOwnProperty("useGpsTime"))
                object.useGpsTime = message.useGpsTime;
            if (message.orgId != null && message.hasOwnProperty("orgId"))
                object.orgId = message.orgId;
            if (message.orgIz != null && message.hasOwnProperty("orgIz"))
                object.orgIz = message.orgIz;
            if (message.sensorLogic != null && message.hasOwnProperty("sensorLogic"))
                object.sensorLogic = options.enums === String ? $root.tutorial.SensorLogic[message.sensorLogic] === undefined ? message.sensorLogic : $root.tutorial.SensorLogic[message.sensorLogic] : message.sensorLogic;
            if (message.timerConfigLanePhotoEye != null && message.hasOwnProperty("timerConfigLanePhotoEye"))
                object.timerConfigLanePhotoEye = $root.tutorial.TimerConfigLanePhotoEye.toObject(message.timerConfigLanePhotoEye, options);
            if (message.timerConfigOpposedStarter != null && message.hasOwnProperty("timerConfigOpposedStarter"))
                object.timerConfigOpposedStarter = $root.tutorial.TimerConfigOpposedStarter.toObject(message.timerConfigOpposedStarter, options);
            if (message.maxTrackSeconds != null && message.hasOwnProperty("maxTrackSeconds"))
                object.maxTrackSeconds = message.maxTrackSeconds;
            if (message.deleted != null && message.hasOwnProperty("deleted"))
                object.deleted = message.deleted;
            if (message.seq != null && message.hasOwnProperty("seq"))
                object.seq = message.seq;
            return object;
        };

        /**
         * Converts this TimerConfig to JSON.
         * @function toJSON
         * @memberof tutorial.TimerConfig
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerConfig.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerConfig
         * @function getTypeUrl
         * @memberof tutorial.TimerConfig
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerConfig.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerConfig";
        };

        return TimerConfig;
    })();

    tutorial.TimerConfigLanePhotoEye = (function() {

        /**
         * Properties of a TimerConfigLanePhotoEye.
         * @memberof tutorial
         * @interface ITimerConfigLanePhotoEye
         * @property {number|null} [maxCarLenMS] TimerConfigLanePhotoEye maxCarLenMS
         * @property {number|null} [minCarLenMS] TimerConfigLanePhotoEye minCarLenMS
         * @property {number|null} [maxPerfCount] TimerConfigLanePhotoEye maxPerfCount
         * @property {number|null} [clearMS] TimerConfigLanePhotoEye clearMS
         */

        /**
         * Constructs a new TimerConfigLanePhotoEye.
         * @memberof tutorial
         * @classdesc Represents a TimerConfigLanePhotoEye.
         * @implements ITimerConfigLanePhotoEye
         * @constructor
         * @param {tutorial.ITimerConfigLanePhotoEye=} [properties] Properties to set
         */
        function TimerConfigLanePhotoEye(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerConfigLanePhotoEye maxCarLenMS.
         * @member {number} maxCarLenMS
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @instance
         */
        TimerConfigLanePhotoEye.prototype.maxCarLenMS = 0;

        /**
         * TimerConfigLanePhotoEye minCarLenMS.
         * @member {number} minCarLenMS
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @instance
         */
        TimerConfigLanePhotoEye.prototype.minCarLenMS = 0;

        /**
         * TimerConfigLanePhotoEye maxPerfCount.
         * @member {number} maxPerfCount
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @instance
         */
        TimerConfigLanePhotoEye.prototype.maxPerfCount = 0;

        /**
         * TimerConfigLanePhotoEye clearMS.
         * @member {number} clearMS
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @instance
         */
        TimerConfigLanePhotoEye.prototype.clearMS = 0;

        /**
         * Creates a new TimerConfigLanePhotoEye instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {tutorial.ITimerConfigLanePhotoEye=} [properties] Properties to set
         * @returns {tutorial.TimerConfigLanePhotoEye} TimerConfigLanePhotoEye instance
         */
        TimerConfigLanePhotoEye.create = function create(properties) {
            return new TimerConfigLanePhotoEye(properties);
        };

        /**
         * Encodes the specified TimerConfigLanePhotoEye message. Does not implicitly {@link tutorial.TimerConfigLanePhotoEye.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {tutorial.ITimerConfigLanePhotoEye} message TimerConfigLanePhotoEye message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigLanePhotoEye.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.maxCarLenMS != null && Object.hasOwnProperty.call(message, "maxCarLenMS"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.maxCarLenMS);
            if (message.minCarLenMS != null && Object.hasOwnProperty.call(message, "minCarLenMS"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.minCarLenMS);
            if (message.maxPerfCount != null && Object.hasOwnProperty.call(message, "maxPerfCount"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.maxPerfCount);
            if (message.clearMS != null && Object.hasOwnProperty.call(message, "clearMS"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.clearMS);
            return writer;
        };

        /**
         * Encodes the specified TimerConfigLanePhotoEye message, length delimited. Does not implicitly {@link tutorial.TimerConfigLanePhotoEye.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {tutorial.ITimerConfigLanePhotoEye} message TimerConfigLanePhotoEye message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigLanePhotoEye.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerConfigLanePhotoEye message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerConfigLanePhotoEye} TimerConfigLanePhotoEye
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigLanePhotoEye.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerConfigLanePhotoEye();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.maxCarLenMS = reader.uint32();
                        break;
                    }
                case 2: {
                        message.minCarLenMS = reader.uint32();
                        break;
                    }
                case 3: {
                        message.maxPerfCount = reader.uint32();
                        break;
                    }
                case 4: {
                        message.clearMS = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerConfigLanePhotoEye message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerConfigLanePhotoEye} TimerConfigLanePhotoEye
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigLanePhotoEye.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerConfigLanePhotoEye message.
         * @function verify
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerConfigLanePhotoEye.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.maxCarLenMS != null && message.hasOwnProperty("maxCarLenMS"))
                if (!$util.isInteger(message.maxCarLenMS))
                    return "maxCarLenMS: integer expected";
            if (message.minCarLenMS != null && message.hasOwnProperty("minCarLenMS"))
                if (!$util.isInteger(message.minCarLenMS))
                    return "minCarLenMS: integer expected";
            if (message.maxPerfCount != null && message.hasOwnProperty("maxPerfCount"))
                if (!$util.isInteger(message.maxPerfCount))
                    return "maxPerfCount: integer expected";
            if (message.clearMS != null && message.hasOwnProperty("clearMS"))
                if (!$util.isInteger(message.clearMS))
                    return "clearMS: integer expected";
            return null;
        };

        /**
         * Creates a TimerConfigLanePhotoEye message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerConfigLanePhotoEye} TimerConfigLanePhotoEye
         */
        TimerConfigLanePhotoEye.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerConfigLanePhotoEye)
                return object;
            var message = new $root.tutorial.TimerConfigLanePhotoEye();
            if (object.maxCarLenMS != null)
                message.maxCarLenMS = object.maxCarLenMS >>> 0;
            if (object.minCarLenMS != null)
                message.minCarLenMS = object.minCarLenMS >>> 0;
            if (object.maxPerfCount != null)
                message.maxPerfCount = object.maxPerfCount >>> 0;
            if (object.clearMS != null)
                message.clearMS = object.clearMS >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TimerConfigLanePhotoEye message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {tutorial.TimerConfigLanePhotoEye} message TimerConfigLanePhotoEye
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerConfigLanePhotoEye.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.maxCarLenMS = 0;
                object.minCarLenMS = 0;
                object.maxPerfCount = 0;
                object.clearMS = 0;
            }
            if (message.maxCarLenMS != null && message.hasOwnProperty("maxCarLenMS"))
                object.maxCarLenMS = message.maxCarLenMS;
            if (message.minCarLenMS != null && message.hasOwnProperty("minCarLenMS"))
                object.minCarLenMS = message.minCarLenMS;
            if (message.maxPerfCount != null && message.hasOwnProperty("maxPerfCount"))
                object.maxPerfCount = message.maxPerfCount;
            if (message.clearMS != null && message.hasOwnProperty("clearMS"))
                object.clearMS = message.clearMS;
            return object;
        };

        /**
         * Converts this TimerConfigLanePhotoEye to JSON.
         * @function toJSON
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerConfigLanePhotoEye.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerConfigLanePhotoEye
         * @function getTypeUrl
         * @memberof tutorial.TimerConfigLanePhotoEye
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerConfigLanePhotoEye.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerConfigLanePhotoEye";
        };

        return TimerConfigLanePhotoEye;
    })();

    tutorial.TimerConfigOpposedStarter = (function() {

        /**
         * Properties of a TimerConfigOpposedStarter.
         * @memberof tutorial
         * @interface ITimerConfigOpposedStarter
         * @property {Array.<tutorial.ITimerConfigOpposedPosition>|null} [paddlesUp] TimerConfigOpposedStarter paddlesUp
         * @property {number|null} [maxTransitionMS] TimerConfigOpposedStarter maxTransitionMS
         * @property {number|null} [minTransitionMS] TimerConfigOpposedStarter minTransitionMS
         */

        /**
         * Constructs a new TimerConfigOpposedStarter.
         * @memberof tutorial
         * @classdesc Represents a TimerConfigOpposedStarter.
         * @implements ITimerConfigOpposedStarter
         * @constructor
         * @param {tutorial.ITimerConfigOpposedStarter=} [properties] Properties to set
         */
        function TimerConfigOpposedStarter(properties) {
            this.paddlesUp = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerConfigOpposedStarter paddlesUp.
         * @member {Array.<tutorial.ITimerConfigOpposedPosition>} paddlesUp
         * @memberof tutorial.TimerConfigOpposedStarter
         * @instance
         */
        TimerConfigOpposedStarter.prototype.paddlesUp = $util.emptyArray;

        /**
         * TimerConfigOpposedStarter maxTransitionMS.
         * @member {number} maxTransitionMS
         * @memberof tutorial.TimerConfigOpposedStarter
         * @instance
         */
        TimerConfigOpposedStarter.prototype.maxTransitionMS = 0;

        /**
         * TimerConfigOpposedStarter minTransitionMS.
         * @member {number} minTransitionMS
         * @memberof tutorial.TimerConfigOpposedStarter
         * @instance
         */
        TimerConfigOpposedStarter.prototype.minTransitionMS = 0;

        /**
         * Creates a new TimerConfigOpposedStarter instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {tutorial.ITimerConfigOpposedStarter=} [properties] Properties to set
         * @returns {tutorial.TimerConfigOpposedStarter} TimerConfigOpposedStarter instance
         */
        TimerConfigOpposedStarter.create = function create(properties) {
            return new TimerConfigOpposedStarter(properties);
        };

        /**
         * Encodes the specified TimerConfigOpposedStarter message. Does not implicitly {@link tutorial.TimerConfigOpposedStarter.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {tutorial.ITimerConfigOpposedStarter} message TimerConfigOpposedStarter message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigOpposedStarter.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.paddlesUp != null && message.paddlesUp.length)
                for (var i = 0; i < message.paddlesUp.length; ++i)
                    $root.tutorial.TimerConfigOpposedPosition.encode(message.paddlesUp[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.maxTransitionMS != null && Object.hasOwnProperty.call(message, "maxTransitionMS"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.maxTransitionMS);
            if (message.minTransitionMS != null && Object.hasOwnProperty.call(message, "minTransitionMS"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.minTransitionMS);
            return writer;
        };

        /**
         * Encodes the specified TimerConfigOpposedStarter message, length delimited. Does not implicitly {@link tutorial.TimerConfigOpposedStarter.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {tutorial.ITimerConfigOpposedStarter} message TimerConfigOpposedStarter message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigOpposedStarter.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerConfigOpposedStarter message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerConfigOpposedStarter} TimerConfigOpposedStarter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigOpposedStarter.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerConfigOpposedStarter();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.paddlesUp && message.paddlesUp.length))
                            message.paddlesUp = [];
                        message.paddlesUp.push($root.tutorial.TimerConfigOpposedPosition.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.maxTransitionMS = reader.uint32();
                        break;
                    }
                case 3: {
                        message.minTransitionMS = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerConfigOpposedStarter message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerConfigOpposedStarter} TimerConfigOpposedStarter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigOpposedStarter.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerConfigOpposedStarter message.
         * @function verify
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerConfigOpposedStarter.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.paddlesUp != null && message.hasOwnProperty("paddlesUp")) {
                if (!Array.isArray(message.paddlesUp))
                    return "paddlesUp: array expected";
                for (var i = 0; i < message.paddlesUp.length; ++i) {
                    var error = $root.tutorial.TimerConfigOpposedPosition.verify(message.paddlesUp[i]);
                    if (error)
                        return "paddlesUp." + error;
                }
            }
            if (message.maxTransitionMS != null && message.hasOwnProperty("maxTransitionMS"))
                if (!$util.isInteger(message.maxTransitionMS))
                    return "maxTransitionMS: integer expected";
            if (message.minTransitionMS != null && message.hasOwnProperty("minTransitionMS"))
                if (!$util.isInteger(message.minTransitionMS))
                    return "minTransitionMS: integer expected";
            return null;
        };

        /**
         * Creates a TimerConfigOpposedStarter message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerConfigOpposedStarter} TimerConfigOpposedStarter
         */
        TimerConfigOpposedStarter.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerConfigOpposedStarter)
                return object;
            var message = new $root.tutorial.TimerConfigOpposedStarter();
            if (object.paddlesUp) {
                if (!Array.isArray(object.paddlesUp))
                    throw TypeError(".tutorial.TimerConfigOpposedStarter.paddlesUp: array expected");
                message.paddlesUp = [];
                for (var i = 0; i < object.paddlesUp.length; ++i) {
                    if (typeof object.paddlesUp[i] !== "object")
                        throw TypeError(".tutorial.TimerConfigOpposedStarter.paddlesUp: object expected");
                    message.paddlesUp[i] = $root.tutorial.TimerConfigOpposedPosition.fromObject(object.paddlesUp[i]);
                }
            }
            if (object.maxTransitionMS != null)
                message.maxTransitionMS = object.maxTransitionMS >>> 0;
            if (object.minTransitionMS != null)
                message.minTransitionMS = object.minTransitionMS >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TimerConfigOpposedStarter message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {tutorial.TimerConfigOpposedStarter} message TimerConfigOpposedStarter
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerConfigOpposedStarter.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.paddlesUp = [];
            if (options.defaults) {
                object.maxTransitionMS = 0;
                object.minTransitionMS = 0;
            }
            if (message.paddlesUp && message.paddlesUp.length) {
                object.paddlesUp = [];
                for (var j = 0; j < message.paddlesUp.length; ++j)
                    object.paddlesUp[j] = $root.tutorial.TimerConfigOpposedPosition.toObject(message.paddlesUp[j], options);
            }
            if (message.maxTransitionMS != null && message.hasOwnProperty("maxTransitionMS"))
                object.maxTransitionMS = message.maxTransitionMS;
            if (message.minTransitionMS != null && message.hasOwnProperty("minTransitionMS"))
                object.minTransitionMS = message.minTransitionMS;
            return object;
        };

        /**
         * Converts this TimerConfigOpposedStarter to JSON.
         * @function toJSON
         * @memberof tutorial.TimerConfigOpposedStarter
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerConfigOpposedStarter.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerConfigOpposedStarter
         * @function getTypeUrl
         * @memberof tutorial.TimerConfigOpposedStarter
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerConfigOpposedStarter.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerConfigOpposedStarter";
        };

        return TimerConfigOpposedStarter;
    })();

    tutorial.TimerConfigOpposedPosition = (function() {

        /**
         * Properties of a TimerConfigOpposedPosition.
         * @memberof tutorial
         * @interface ITimerConfigOpposedPosition
         * @property {tutorial.PinState|null} [pinState] TimerConfigOpposedPosition pinState
         * @property {tutorial.PinName|null} [pinName] TimerConfigOpposedPosition pinName
         */

        /**
         * Constructs a new TimerConfigOpposedPosition.
         * @memberof tutorial
         * @classdesc Represents a TimerConfigOpposedPosition.
         * @implements ITimerConfigOpposedPosition
         * @constructor
         * @param {tutorial.ITimerConfigOpposedPosition=} [properties] Properties to set
         */
        function TimerConfigOpposedPosition(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerConfigOpposedPosition pinState.
         * @member {tutorial.PinState} pinState
         * @memberof tutorial.TimerConfigOpposedPosition
         * @instance
         */
        TimerConfigOpposedPosition.prototype.pinState = 0;

        /**
         * TimerConfigOpposedPosition pinName.
         * @member {tutorial.PinName} pinName
         * @memberof tutorial.TimerConfigOpposedPosition
         * @instance
         */
        TimerConfigOpposedPosition.prototype.pinName = 1;

        /**
         * Creates a new TimerConfigOpposedPosition instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {tutorial.ITimerConfigOpposedPosition=} [properties] Properties to set
         * @returns {tutorial.TimerConfigOpposedPosition} TimerConfigOpposedPosition instance
         */
        TimerConfigOpposedPosition.create = function create(properties) {
            return new TimerConfigOpposedPosition(properties);
        };

        /**
         * Encodes the specified TimerConfigOpposedPosition message. Does not implicitly {@link tutorial.TimerConfigOpposedPosition.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {tutorial.ITimerConfigOpposedPosition} message TimerConfigOpposedPosition message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigOpposedPosition.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.pinState != null && Object.hasOwnProperty.call(message, "pinState"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.pinState);
            if (message.pinName != null && Object.hasOwnProperty.call(message, "pinName"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.pinName);
            return writer;
        };

        /**
         * Encodes the specified TimerConfigOpposedPosition message, length delimited. Does not implicitly {@link tutorial.TimerConfigOpposedPosition.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {tutorial.ITimerConfigOpposedPosition} message TimerConfigOpposedPosition message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerConfigOpposedPosition.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerConfigOpposedPosition message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerConfigOpposedPosition} TimerConfigOpposedPosition
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigOpposedPosition.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerConfigOpposedPosition();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.pinState = reader.int32();
                        break;
                    }
                case 2: {
                        message.pinName = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerConfigOpposedPosition message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerConfigOpposedPosition} TimerConfigOpposedPosition
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerConfigOpposedPosition.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerConfigOpposedPosition message.
         * @function verify
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerConfigOpposedPosition.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.pinState != null && message.hasOwnProperty("pinState"))
                switch (message.pinState) {
                default:
                    return "pinState: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                switch (message.pinName) {
                default:
                    return "pinName: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 9:
                    break;
                }
            return null;
        };

        /**
         * Creates a TimerConfigOpposedPosition message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerConfigOpposedPosition} TimerConfigOpposedPosition
         */
        TimerConfigOpposedPosition.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerConfigOpposedPosition)
                return object;
            var message = new $root.tutorial.TimerConfigOpposedPosition();
            switch (object.pinState) {
            default:
                if (typeof object.pinState === "number") {
                    message.pinState = object.pinState;
                    break;
                }
                break;
            case "CLEAR":
            case 0:
                message.pinState = 0;
                break;
            case "BLOCKED":
            case 1:
                message.pinState = 1;
                break;
            case "UNKNOWN_STATE":
            case 2:
                message.pinState = 2;
                break;
            }
            switch (object.pinName) {
            default:
                if (typeof object.pinName === "number") {
                    message.pinName = object.pinName;
                    break;
                }
                break;
            case "lane1":
            case 1:
                message.pinName = 1;
                break;
            case "lane2":
            case 2:
                message.pinName = 2;
                break;
            case "gpsHz":
            case 3:
                message.pinName = 3;
                break;
            case "oneHz":
            case 4:
                message.pinName = 4;
                break;
            case "UNKNOWN_PIN":
            case 9:
                message.pinName = 9;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerConfigOpposedPosition message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {tutorial.TimerConfigOpposedPosition} message TimerConfigOpposedPosition
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerConfigOpposedPosition.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.pinState = options.enums === String ? "CLEAR" : 0;
                object.pinName = options.enums === String ? "lane1" : 1;
            }
            if (message.pinState != null && message.hasOwnProperty("pinState"))
                object.pinState = options.enums === String ? $root.tutorial.PinState[message.pinState] === undefined ? message.pinState : $root.tutorial.PinState[message.pinState] : message.pinState;
            if (message.pinName != null && message.hasOwnProperty("pinName"))
                object.pinName = options.enums === String ? $root.tutorial.PinName[message.pinName] === undefined ? message.pinName : $root.tutorial.PinName[message.pinName] : message.pinName;
            return object;
        };

        /**
         * Converts this TimerConfigOpposedPosition to JSON.
         * @function toJSON
         * @memberof tutorial.TimerConfigOpposedPosition
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerConfigOpposedPosition.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerConfigOpposedPosition
         * @function getTypeUrl
         * @memberof tutorial.TimerConfigOpposedPosition
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerConfigOpposedPosition.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerConfigOpposedPosition";
        };

        return TimerConfigOpposedPosition;
    })();

    tutorial.TimerEventList = (function() {

        /**
         * Properties of a TimerEventList.
         * @memberof tutorial
         * @interface ITimerEventList
         * @property {Array.<tutorial.ITimerEvent>|null} [timerEvent] TimerEventList timerEvent
         */

        /**
         * Constructs a new TimerEventList.
         * @memberof tutorial
         * @classdesc Represents a TimerEventList.
         * @implements ITimerEventList
         * @constructor
         * @param {tutorial.ITimerEventList=} [properties] Properties to set
         */
        function TimerEventList(properties) {
            this.timerEvent = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerEventList timerEvent.
         * @member {Array.<tutorial.ITimerEvent>} timerEvent
         * @memberof tutorial.TimerEventList
         * @instance
         */
        TimerEventList.prototype.timerEvent = $util.emptyArray;

        /**
         * Creates a new TimerEventList instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerEventList
         * @static
         * @param {tutorial.ITimerEventList=} [properties] Properties to set
         * @returns {tutorial.TimerEventList} TimerEventList instance
         */
        TimerEventList.create = function create(properties) {
            return new TimerEventList(properties);
        };

        /**
         * Encodes the specified TimerEventList message. Does not implicitly {@link tutorial.TimerEventList.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerEventList
         * @static
         * @param {tutorial.ITimerEventList} message TimerEventList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerEventList.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timerEvent != null && message.timerEvent.length)
                for (var i = 0; i < message.timerEvent.length; ++i)
                    $root.tutorial.TimerEvent.encode(message.timerEvent[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TimerEventList message, length delimited. Does not implicitly {@link tutorial.TimerEventList.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerEventList
         * @static
         * @param {tutorial.ITimerEventList} message TimerEventList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerEventList.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerEventList message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerEventList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerEventList} TimerEventList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerEventList.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerEventList();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.timerEvent && message.timerEvent.length))
                            message.timerEvent = [];
                        message.timerEvent.push($root.tutorial.TimerEvent.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerEventList message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerEventList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerEventList} TimerEventList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerEventList.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerEventList message.
         * @function verify
         * @memberof tutorial.TimerEventList
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerEventList.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timerEvent != null && message.hasOwnProperty("timerEvent")) {
                if (!Array.isArray(message.timerEvent))
                    return "timerEvent: array expected";
                for (var i = 0; i < message.timerEvent.length; ++i) {
                    var error = $root.tutorial.TimerEvent.verify(message.timerEvent[i]);
                    if (error)
                        return "timerEvent." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TimerEventList message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerEventList
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerEventList} TimerEventList
         */
        TimerEventList.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerEventList)
                return object;
            var message = new $root.tutorial.TimerEventList();
            if (object.timerEvent) {
                if (!Array.isArray(object.timerEvent))
                    throw TypeError(".tutorial.TimerEventList.timerEvent: array expected");
                message.timerEvent = [];
                for (var i = 0; i < object.timerEvent.length; ++i) {
                    if (typeof object.timerEvent[i] !== "object")
                        throw TypeError(".tutorial.TimerEventList.timerEvent: object expected");
                    message.timerEvent[i] = $root.tutorial.TimerEvent.fromObject(object.timerEvent[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerEventList message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerEventList
         * @static
         * @param {tutorial.TimerEventList} message TimerEventList
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerEventList.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.timerEvent = [];
            if (message.timerEvent && message.timerEvent.length) {
                object.timerEvent = [];
                for (var j = 0; j < message.timerEvent.length; ++j)
                    object.timerEvent[j] = $root.tutorial.TimerEvent.toObject(message.timerEvent[j], options);
            }
            return object;
        };

        /**
         * Converts this TimerEventList to JSON.
         * @function toJSON
         * @memberof tutorial.TimerEventList
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerEventList.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerEventList
         * @function getTypeUrl
         * @memberof tutorial.TimerEventList
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerEventList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerEventList";
        };

        return TimerEventList;
    })();

    tutorial.TimerEvent = (function() {

        /**
         * Properties of a TimerEvent.
         * @memberof tutorial
         * @interface ITimerEvent
         * @property {tutorial.IEventLaneTime|null} [eventLaneTime] TimerEvent eventLaneTime
         * @property {tutorial.IEventRacePaddleDrop|null} [eventRacePaddleDrop] TimerEvent eventRacePaddleDrop
         * @property {tutorial.IEventTimerAvailability|null} [eventTimerAvailability] TimerEvent eventTimerAvailability
         * @property {tutorial.IEventTimerHealthAlert|null} [eventTimerHealthAlert] TimerEvent eventTimerHealthAlert
         */

        /**
         * Constructs a new TimerEvent.
         * @memberof tutorial
         * @classdesc Represents a TimerEvent.
         * @implements ITimerEvent
         * @constructor
         * @param {tutorial.ITimerEvent=} [properties] Properties to set
         */
        function TimerEvent(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TimerEvent eventLaneTime.
         * @member {tutorial.IEventLaneTime|null|undefined} eventLaneTime
         * @memberof tutorial.TimerEvent
         * @instance
         */
        TimerEvent.prototype.eventLaneTime = null;

        /**
         * TimerEvent eventRacePaddleDrop.
         * @member {tutorial.IEventRacePaddleDrop|null|undefined} eventRacePaddleDrop
         * @memberof tutorial.TimerEvent
         * @instance
         */
        TimerEvent.prototype.eventRacePaddleDrop = null;

        /**
         * TimerEvent eventTimerAvailability.
         * @member {tutorial.IEventTimerAvailability|null|undefined} eventTimerAvailability
         * @memberof tutorial.TimerEvent
         * @instance
         */
        TimerEvent.prototype.eventTimerAvailability = null;

        /**
         * TimerEvent eventTimerHealthAlert.
         * @member {tutorial.IEventTimerHealthAlert|null|undefined} eventTimerHealthAlert
         * @memberof tutorial.TimerEvent
         * @instance
         */
        TimerEvent.prototype.eventTimerHealthAlert = null;

        /**
         * Creates a new TimerEvent instance using the specified properties.
         * @function create
         * @memberof tutorial.TimerEvent
         * @static
         * @param {tutorial.ITimerEvent=} [properties] Properties to set
         * @returns {tutorial.TimerEvent} TimerEvent instance
         */
        TimerEvent.create = function create(properties) {
            return new TimerEvent(properties);
        };

        /**
         * Encodes the specified TimerEvent message. Does not implicitly {@link tutorial.TimerEvent.verify|verify} messages.
         * @function encode
         * @memberof tutorial.TimerEvent
         * @static
         * @param {tutorial.ITimerEvent} message TimerEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerEvent.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.eventLaneTime != null && Object.hasOwnProperty.call(message, "eventLaneTime"))
                $root.tutorial.EventLaneTime.encode(message.eventLaneTime, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.eventRacePaddleDrop != null && Object.hasOwnProperty.call(message, "eventRacePaddleDrop"))
                $root.tutorial.EventRacePaddleDrop.encode(message.eventRacePaddleDrop, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.eventTimerAvailability != null && Object.hasOwnProperty.call(message, "eventTimerAvailability"))
                $root.tutorial.EventTimerAvailability.encode(message.eventTimerAvailability, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.eventTimerHealthAlert != null && Object.hasOwnProperty.call(message, "eventTimerHealthAlert"))
                $root.tutorial.EventTimerHealthAlert.encode(message.eventTimerHealthAlert, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TimerEvent message, length delimited. Does not implicitly {@link tutorial.TimerEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.TimerEvent
         * @static
         * @param {tutorial.ITimerEvent} message TimerEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TimerEvent.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TimerEvent message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.TimerEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.TimerEvent} TimerEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerEvent.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.TimerEvent();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.eventLaneTime = $root.tutorial.EventLaneTime.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.eventRacePaddleDrop = $root.tutorial.EventRacePaddleDrop.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.eventTimerAvailability = $root.tutorial.EventTimerAvailability.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.eventTimerHealthAlert = $root.tutorial.EventTimerHealthAlert.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TimerEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.TimerEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.TimerEvent} TimerEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TimerEvent.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TimerEvent message.
         * @function verify
         * @memberof tutorial.TimerEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TimerEvent.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.eventLaneTime != null && message.hasOwnProperty("eventLaneTime")) {
                var error = $root.tutorial.EventLaneTime.verify(message.eventLaneTime);
                if (error)
                    return "eventLaneTime." + error;
            }
            if (message.eventRacePaddleDrop != null && message.hasOwnProperty("eventRacePaddleDrop")) {
                var error = $root.tutorial.EventRacePaddleDrop.verify(message.eventRacePaddleDrop);
                if (error)
                    return "eventRacePaddleDrop." + error;
            }
            if (message.eventTimerAvailability != null && message.hasOwnProperty("eventTimerAvailability")) {
                var error = $root.tutorial.EventTimerAvailability.verify(message.eventTimerAvailability);
                if (error)
                    return "eventTimerAvailability." + error;
            }
            if (message.eventTimerHealthAlert != null && message.hasOwnProperty("eventTimerHealthAlert")) {
                var error = $root.tutorial.EventTimerHealthAlert.verify(message.eventTimerHealthAlert);
                if (error)
                    return "eventTimerHealthAlert." + error;
            }
            return null;
        };

        /**
         * Creates a TimerEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.TimerEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.TimerEvent} TimerEvent
         */
        TimerEvent.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.TimerEvent)
                return object;
            var message = new $root.tutorial.TimerEvent();
            if (object.eventLaneTime != null) {
                if (typeof object.eventLaneTime !== "object")
                    throw TypeError(".tutorial.TimerEvent.eventLaneTime: object expected");
                message.eventLaneTime = $root.tutorial.EventLaneTime.fromObject(object.eventLaneTime);
            }
            if (object.eventRacePaddleDrop != null) {
                if (typeof object.eventRacePaddleDrop !== "object")
                    throw TypeError(".tutorial.TimerEvent.eventRacePaddleDrop: object expected");
                message.eventRacePaddleDrop = $root.tutorial.EventRacePaddleDrop.fromObject(object.eventRacePaddleDrop);
            }
            if (object.eventTimerAvailability != null) {
                if (typeof object.eventTimerAvailability !== "object")
                    throw TypeError(".tutorial.TimerEvent.eventTimerAvailability: object expected");
                message.eventTimerAvailability = $root.tutorial.EventTimerAvailability.fromObject(object.eventTimerAvailability);
            }
            if (object.eventTimerHealthAlert != null) {
                if (typeof object.eventTimerHealthAlert !== "object")
                    throw TypeError(".tutorial.TimerEvent.eventTimerHealthAlert: object expected");
                message.eventTimerHealthAlert = $root.tutorial.EventTimerHealthAlert.fromObject(object.eventTimerHealthAlert);
            }
            return message;
        };

        /**
         * Creates a plain object from a TimerEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.TimerEvent
         * @static
         * @param {tutorial.TimerEvent} message TimerEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TimerEvent.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.eventLaneTime = null;
                object.eventRacePaddleDrop = null;
                object.eventTimerAvailability = null;
                object.eventTimerHealthAlert = null;
            }
            if (message.eventLaneTime != null && message.hasOwnProperty("eventLaneTime"))
                object.eventLaneTime = $root.tutorial.EventLaneTime.toObject(message.eventLaneTime, options);
            if (message.eventRacePaddleDrop != null && message.hasOwnProperty("eventRacePaddleDrop"))
                object.eventRacePaddleDrop = $root.tutorial.EventRacePaddleDrop.toObject(message.eventRacePaddleDrop, options);
            if (message.eventTimerAvailability != null && message.hasOwnProperty("eventTimerAvailability"))
                object.eventTimerAvailability = $root.tutorial.EventTimerAvailability.toObject(message.eventTimerAvailability, options);
            if (message.eventTimerHealthAlert != null && message.hasOwnProperty("eventTimerHealthAlert"))
                object.eventTimerHealthAlert = $root.tutorial.EventTimerHealthAlert.toObject(message.eventTimerHealthAlert, options);
            return object;
        };

        /**
         * Converts this TimerEvent to JSON.
         * @function toJSON
         * @memberof tutorial.TimerEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TimerEvent.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TimerEvent
         * @function getTypeUrl
         * @memberof tutorial.TimerEvent
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TimerEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.TimerEvent";
        };

        return TimerEvent;
    })();

    tutorial.EventRacePaddleDrop = (function() {

        /**
         * Properties of an EventRacePaddleDrop.
         * @memberof tutorial
         * @interface IEventRacePaddleDrop
         */

        /**
         * Constructs a new EventRacePaddleDrop.
         * @memberof tutorial
         * @classdesc Represents an EventRacePaddleDrop.
         * @implements IEventRacePaddleDrop
         * @constructor
         * @param {tutorial.IEventRacePaddleDrop=} [properties] Properties to set
         */
        function EventRacePaddleDrop(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new EventRacePaddleDrop instance using the specified properties.
         * @function create
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {tutorial.IEventRacePaddleDrop=} [properties] Properties to set
         * @returns {tutorial.EventRacePaddleDrop} EventRacePaddleDrop instance
         */
        EventRacePaddleDrop.create = function create(properties) {
            return new EventRacePaddleDrop(properties);
        };

        /**
         * Encodes the specified EventRacePaddleDrop message. Does not implicitly {@link tutorial.EventRacePaddleDrop.verify|verify} messages.
         * @function encode
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {tutorial.IEventRacePaddleDrop} message EventRacePaddleDrop message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventRacePaddleDrop.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified EventRacePaddleDrop message, length delimited. Does not implicitly {@link tutorial.EventRacePaddleDrop.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {tutorial.IEventRacePaddleDrop} message EventRacePaddleDrop message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventRacePaddleDrop.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EventRacePaddleDrop message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.EventRacePaddleDrop} EventRacePaddleDrop
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventRacePaddleDrop.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.EventRacePaddleDrop();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an EventRacePaddleDrop message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.EventRacePaddleDrop} EventRacePaddleDrop
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventRacePaddleDrop.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EventRacePaddleDrop message.
         * @function verify
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EventRacePaddleDrop.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates an EventRacePaddleDrop message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.EventRacePaddleDrop} EventRacePaddleDrop
         */
        EventRacePaddleDrop.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.EventRacePaddleDrop)
                return object;
            return new $root.tutorial.EventRacePaddleDrop();
        };

        /**
         * Creates a plain object from an EventRacePaddleDrop message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {tutorial.EventRacePaddleDrop} message EventRacePaddleDrop
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EventRacePaddleDrop.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this EventRacePaddleDrop to JSON.
         * @function toJSON
         * @memberof tutorial.EventRacePaddleDrop
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EventRacePaddleDrop.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EventRacePaddleDrop
         * @function getTypeUrl
         * @memberof tutorial.EventRacePaddleDrop
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EventRacePaddleDrop.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.EventRacePaddleDrop";
        };

        return EventRacePaddleDrop;
    })();

    tutorial.EventTimerAvailability = (function() {

        /**
         * Properties of an EventTimerAvailability.
         * @memberof tutorial
         * @interface IEventTimerAvailability
         */

        /**
         * Constructs a new EventTimerAvailability.
         * @memberof tutorial
         * @classdesc Represents an EventTimerAvailability.
         * @implements IEventTimerAvailability
         * @constructor
         * @param {tutorial.IEventTimerAvailability=} [properties] Properties to set
         */
        function EventTimerAvailability(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new EventTimerAvailability instance using the specified properties.
         * @function create
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {tutorial.IEventTimerAvailability=} [properties] Properties to set
         * @returns {tutorial.EventTimerAvailability} EventTimerAvailability instance
         */
        EventTimerAvailability.create = function create(properties) {
            return new EventTimerAvailability(properties);
        };

        /**
         * Encodes the specified EventTimerAvailability message. Does not implicitly {@link tutorial.EventTimerAvailability.verify|verify} messages.
         * @function encode
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {tutorial.IEventTimerAvailability} message EventTimerAvailability message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventTimerAvailability.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified EventTimerAvailability message, length delimited. Does not implicitly {@link tutorial.EventTimerAvailability.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {tutorial.IEventTimerAvailability} message EventTimerAvailability message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventTimerAvailability.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EventTimerAvailability message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.EventTimerAvailability} EventTimerAvailability
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventTimerAvailability.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.EventTimerAvailability();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an EventTimerAvailability message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.EventTimerAvailability} EventTimerAvailability
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventTimerAvailability.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EventTimerAvailability message.
         * @function verify
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EventTimerAvailability.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates an EventTimerAvailability message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.EventTimerAvailability} EventTimerAvailability
         */
        EventTimerAvailability.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.EventTimerAvailability)
                return object;
            return new $root.tutorial.EventTimerAvailability();
        };

        /**
         * Creates a plain object from an EventTimerAvailability message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {tutorial.EventTimerAvailability} message EventTimerAvailability
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EventTimerAvailability.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this EventTimerAvailability to JSON.
         * @function toJSON
         * @memberof tutorial.EventTimerAvailability
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EventTimerAvailability.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EventTimerAvailability
         * @function getTypeUrl
         * @memberof tutorial.EventTimerAvailability
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EventTimerAvailability.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.EventTimerAvailability";
        };

        return EventTimerAvailability;
    })();

    tutorial.EventTimerHealthAlert = (function() {

        /**
         * Properties of an EventTimerHealthAlert.
         * @memberof tutorial
         * @interface IEventTimerHealthAlert
         */

        /**
         * Constructs a new EventTimerHealthAlert.
         * @memberof tutorial
         * @classdesc Represents an EventTimerHealthAlert.
         * @implements IEventTimerHealthAlert
         * @constructor
         * @param {tutorial.IEventTimerHealthAlert=} [properties] Properties to set
         */
        function EventTimerHealthAlert(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new EventTimerHealthAlert instance using the specified properties.
         * @function create
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {tutorial.IEventTimerHealthAlert=} [properties] Properties to set
         * @returns {tutorial.EventTimerHealthAlert} EventTimerHealthAlert instance
         */
        EventTimerHealthAlert.create = function create(properties) {
            return new EventTimerHealthAlert(properties);
        };

        /**
         * Encodes the specified EventTimerHealthAlert message. Does not implicitly {@link tutorial.EventTimerHealthAlert.verify|verify} messages.
         * @function encode
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {tutorial.IEventTimerHealthAlert} message EventTimerHealthAlert message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventTimerHealthAlert.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified EventTimerHealthAlert message, length delimited. Does not implicitly {@link tutorial.EventTimerHealthAlert.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {tutorial.IEventTimerHealthAlert} message EventTimerHealthAlert message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventTimerHealthAlert.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EventTimerHealthAlert message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.EventTimerHealthAlert} EventTimerHealthAlert
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventTimerHealthAlert.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.EventTimerHealthAlert();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an EventTimerHealthAlert message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.EventTimerHealthAlert} EventTimerHealthAlert
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventTimerHealthAlert.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EventTimerHealthAlert message.
         * @function verify
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EventTimerHealthAlert.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates an EventTimerHealthAlert message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.EventTimerHealthAlert} EventTimerHealthAlert
         */
        EventTimerHealthAlert.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.EventTimerHealthAlert)
                return object;
            return new $root.tutorial.EventTimerHealthAlert();
        };

        /**
         * Creates a plain object from an EventTimerHealthAlert message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {tutorial.EventTimerHealthAlert} message EventTimerHealthAlert
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EventTimerHealthAlert.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this EventTimerHealthAlert to JSON.
         * @function toJSON
         * @memberof tutorial.EventTimerHealthAlert
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EventTimerHealthAlert.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EventTimerHealthAlert
         * @function getTypeUrl
         * @memberof tutorial.EventTimerHealthAlert
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EventTimerHealthAlert.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.EventTimerHealthAlert";
        };

        return EventTimerHealthAlert;
    })();

    tutorial.EventLaneTime = (function() {

        /**
         * Properties of an EventLaneTime.
         * @memberof tutorial
         * @interface IEventLaneTime
         * @property {tutorial.PinName|null} [lane] EventLaneTime lane
         * @property {tutorial.ITimerPin|null} [noseTime] EventLaneTime noseTime
         * @property {tutorial.ITimerPin|null} [tailTime] EventLaneTime tailTime
         * @property {boolean|null} [lanePairFound] EventLaneTime lanePairFound
         */

        /**
         * Constructs a new EventLaneTime.
         * @memberof tutorial
         * @classdesc Represents an EventLaneTime.
         * @implements IEventLaneTime
         * @constructor
         * @param {tutorial.IEventLaneTime=} [properties] Properties to set
         */
        function EventLaneTime(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * EventLaneTime lane.
         * @member {tutorial.PinName} lane
         * @memberof tutorial.EventLaneTime
         * @instance
         */
        EventLaneTime.prototype.lane = 1;

        /**
         * EventLaneTime noseTime.
         * @member {tutorial.ITimerPin|null|undefined} noseTime
         * @memberof tutorial.EventLaneTime
         * @instance
         */
        EventLaneTime.prototype.noseTime = null;

        /**
         * EventLaneTime tailTime.
         * @member {tutorial.ITimerPin|null|undefined} tailTime
         * @memberof tutorial.EventLaneTime
         * @instance
         */
        EventLaneTime.prototype.tailTime = null;

        /**
         * EventLaneTime lanePairFound.
         * @member {boolean} lanePairFound
         * @memberof tutorial.EventLaneTime
         * @instance
         */
        EventLaneTime.prototype.lanePairFound = false;

        /**
         * Creates a new EventLaneTime instance using the specified properties.
         * @function create
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {tutorial.IEventLaneTime=} [properties] Properties to set
         * @returns {tutorial.EventLaneTime} EventLaneTime instance
         */
        EventLaneTime.create = function create(properties) {
            return new EventLaneTime(properties);
        };

        /**
         * Encodes the specified EventLaneTime message. Does not implicitly {@link tutorial.EventLaneTime.verify|verify} messages.
         * @function encode
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {tutorial.IEventLaneTime} message EventLaneTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventLaneTime.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.lane != null && Object.hasOwnProperty.call(message, "lane"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.lane);
            if (message.noseTime != null && Object.hasOwnProperty.call(message, "noseTime"))
                $root.tutorial.TimerPin.encode(message.noseTime, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.tailTime != null && Object.hasOwnProperty.call(message, "tailTime"))
                $root.tutorial.TimerPin.encode(message.tailTime, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.lanePairFound != null && Object.hasOwnProperty.call(message, "lanePairFound"))
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.lanePairFound);
            return writer;
        };

        /**
         * Encodes the specified EventLaneTime message, length delimited. Does not implicitly {@link tutorial.EventLaneTime.verify|verify} messages.
         * @function encodeDelimited
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {tutorial.IEventLaneTime} message EventLaneTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EventLaneTime.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EventLaneTime message from the specified reader or buffer.
         * @function decode
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {tutorial.EventLaneTime} EventLaneTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventLaneTime.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.tutorial.EventLaneTime();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.lane = reader.int32();
                        break;
                    }
                case 2: {
                        message.noseTime = $root.tutorial.TimerPin.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.tailTime = $root.tutorial.TimerPin.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.lanePairFound = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an EventLaneTime message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {tutorial.EventLaneTime} EventLaneTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EventLaneTime.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EventLaneTime message.
         * @function verify
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EventLaneTime.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.lane != null && message.hasOwnProperty("lane"))
                switch (message.lane) {
                default:
                    return "lane: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 9:
                    break;
                }
            if (message.noseTime != null && message.hasOwnProperty("noseTime")) {
                var error = $root.tutorial.TimerPin.verify(message.noseTime);
                if (error)
                    return "noseTime." + error;
            }
            if (message.tailTime != null && message.hasOwnProperty("tailTime")) {
                var error = $root.tutorial.TimerPin.verify(message.tailTime);
                if (error)
                    return "tailTime." + error;
            }
            if (message.lanePairFound != null && message.hasOwnProperty("lanePairFound"))
                if (typeof message.lanePairFound !== "boolean")
                    return "lanePairFound: boolean expected";
            return null;
        };

        /**
         * Creates an EventLaneTime message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {tutorial.EventLaneTime} EventLaneTime
         */
        EventLaneTime.fromObject = function fromObject(object) {
            if (object instanceof $root.tutorial.EventLaneTime)
                return object;
            var message = new $root.tutorial.EventLaneTime();
            switch (object.lane) {
            default:
                if (typeof object.lane === "number") {
                    message.lane = object.lane;
                    break;
                }
                break;
            case "lane1":
            case 1:
                message.lane = 1;
                break;
            case "lane2":
            case 2:
                message.lane = 2;
                break;
            case "gpsHz":
            case 3:
                message.lane = 3;
                break;
            case "oneHz":
            case 4:
                message.lane = 4;
                break;
            case "UNKNOWN_PIN":
            case 9:
                message.lane = 9;
                break;
            }
            if (object.noseTime != null) {
                if (typeof object.noseTime !== "object")
                    throw TypeError(".tutorial.EventLaneTime.noseTime: object expected");
                message.noseTime = $root.tutorial.TimerPin.fromObject(object.noseTime);
            }
            if (object.tailTime != null) {
                if (typeof object.tailTime !== "object")
                    throw TypeError(".tutorial.EventLaneTime.tailTime: object expected");
                message.tailTime = $root.tutorial.TimerPin.fromObject(object.tailTime);
            }
            if (object.lanePairFound != null)
                message.lanePairFound = Boolean(object.lanePairFound);
            return message;
        };

        /**
         * Creates a plain object from an EventLaneTime message. Also converts values to other types if specified.
         * @function toObject
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {tutorial.EventLaneTime} message EventLaneTime
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EventLaneTime.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.lane = options.enums === String ? "lane1" : 1;
                object.noseTime = null;
                object.tailTime = null;
                object.lanePairFound = false;
            }
            if (message.lane != null && message.hasOwnProperty("lane"))
                object.lane = options.enums === String ? $root.tutorial.PinName[message.lane] === undefined ? message.lane : $root.tutorial.PinName[message.lane] : message.lane;
            if (message.noseTime != null && message.hasOwnProperty("noseTime"))
                object.noseTime = $root.tutorial.TimerPin.toObject(message.noseTime, options);
            if (message.tailTime != null && message.hasOwnProperty("tailTime"))
                object.tailTime = $root.tutorial.TimerPin.toObject(message.tailTime, options);
            if (message.lanePairFound != null && message.hasOwnProperty("lanePairFound"))
                object.lanePairFound = message.lanePairFound;
            return object;
        };

        /**
         * Converts this EventLaneTime to JSON.
         * @function toJSON
         * @memberof tutorial.EventLaneTime
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EventLaneTime.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EventLaneTime
         * @function getTypeUrl
         * @memberof tutorial.EventLaneTime
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EventLaneTime.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/tutorial.EventLaneTime";
        };

        return EventLaneTime;
    })();

    return tutorial;
})();

$root.google = (function() {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    var google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        var protobuf = {};

        protobuf.Timestamp = (function() {

            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @property {Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @implements ITimestamp
             * @constructor
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             */
            function Timestamp(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Timestamp seconds.
             * @member {Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             */
            Timestamp.create = function create(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.seconds != null && Object.hasOwnProperty.call(message, "seconds"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.seconds);
                if (message.nanos != null && Object.hasOwnProperty.call(message, "nanos"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.nanos);
                return writer;
            };

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Timestamp();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.seconds = reader.int64();
                            break;
                        }
                    case 2: {
                            message.nanos = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high)))
                        return "seconds: integer|Long expected";
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    if (!$util.isInteger(message.nanos))
                        return "nanos: integer expected";
                return null;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Timestamp)
                    return object;
                var message = new $root.google.protobuf.Timestamp();
                if (object.seconds != null)
                    if ($util.Long)
                        (message.seconds = $util.Long.fromValue(object.seconds)).unsigned = false;
                    else if (typeof object.seconds === "string")
                        message.seconds = parseInt(object.seconds, 10);
                    else if (typeof object.seconds === "number")
                        message.seconds = object.seconds;
                    else if (typeof object.seconds === "object")
                        message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                if (object.nanos != null)
                    message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.seconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else
                        object.seconds = options.longs === String ? "0" : 0;
                    object.nanos = 0;
                }
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (typeof message.seconds === "number")
                        object.seconds = options.longs === String ? String(message.seconds) : message.seconds;
                    else
                        object.seconds = options.longs === String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Timestamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Timestamp";
            };

            return Timestamp;
        })();

        return protobuf;
    })();

    return google;
})();

module.exports = $root;
