// Originally copied from https://github.com/rlidwka/sinopia/blob/master/lib/logger.js.
var Logger = require('bunyan');
var Error = require('http-errors');
var _ = require("lodash");
var colors = require("colors");
var Stream = require('stream');

function getlvl(x) {
    switch (true) {
        case x < 15:
            return 'trace'
        case x < 25:
            return 'debug'
        case x < 35:
            return 'info'
        case x == 35:
            return 'http'
        case x < 45:
            return 'warn'
        case x < 55:
            return 'error'
        default:
            return 'fatal'
    }
}

module.exports.setup = function(appName, logs) {
    var streams = []
    if (logs == null) logs = [{
        type: 'stdout',
        format: 'pretty',
        level: 'http'
    }]

    logs.forEach(function(target) {
        var stream = new Stream()
        stream.writable = true

        if (target.type === 'stdout' || target.type === 'stderr') {
            // destination stream
            var dest = target.type === 'stdout' ? process.stdout : process.stderr

            if (target.format === 'pretty') {
                // making fake stream for prettypritting
                stream.write = function(obj) {
                    dest.write(print(obj.level, obj.msg, obj, dest.isTTY) + '\n')
                }
            } else {
                stream.write = function(obj) {
                    dest.write(JSON.stringify(obj, Logger.safeCycles()) + '\n')
                }
            }
        } else if (target.type === 'file') {
            var dest = require('fs').createWriteStream(target.path, {
                flags: 'a',
                encoding: 'utf8'
            })
            dest.on('error', function(err) {
                Logger.emit('error', err)
            })
            stream.write = function(obj) {
                if (target.format === 'pretty') {
                    dest.write(print(obj.level, obj.msg, obj, false) + '\n')
                } else {
                    dest.write(JSON.stringify(obj, Logger.safeCycles()) + '\n')
                }
            }
        } else {
            throw Error('wrong target type for a log')
        }

        if (target.level === 'http') target.level = 35
        streams.push({
            type: 'raw',
            level: target.level || 35,
            stream: stream,
        })
    })

    var logger = new Logger({
        name: appName,
        streams: streams,
        serializers: {
            err: Logger.stdSerializers.err,
            req: Logger.stdSerializers.req,
            res: Logger.stdSerializers.res,
        },
    })

    module.exports.logger = logger
}

// adopted from socket.io
// this part was converted to coffee-script and back again over the years,
// so it might look weird

// level to color
var levels = {
    fatal: 31,
    error: 31,
    warn: 33,
    http: 35,
    info: 36,
    debug: 90,
    trace: 90,
}

var max = 0
for (var l in levels) {
    max = Math.max(max, l.length)
}

function pad(str) {
    if (str.length < max) return str + ' '.repeat(max - str.length)
    return str
}

var subsystems = [{ in : '\033[32m<--\033[39m',
    out: '\033[33m-->\033[39m',
    fs: '\033[90m-=-\033[39m',
    default: '\033[34m---\033[39m',
}, { in : '<--',
    out: '-->',
    fs: '-=-',
    default: '---',
}]

function print(type, msg, obj, colors) {
    if (typeof type === 'number') type = getlvl(type)
    var prefix = null;
    switch(type) {
        case "info": 
            prefix = "[Info]".blue;
            break;
        case "debug":
            prefix = "[Info]".white;
            break;
        case "warn": 
            prefix = "[Warn]".gray;
            break;
        case "error": 
        case "fatal": 
            prefix = "[Error]".red;
            break;
        default:
            prefix = "["+type+"]".white;
            break;
    }
    var finalMsg = prefix + "\t" + msg
    return finalMsg
}