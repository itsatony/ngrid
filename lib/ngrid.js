var toStream = require('tostream');
var Q = require('q');
var Promise = Q.Promise;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
// https://github.com/aheckmann/gridfs-stream
var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
Grid.mongo = mongoose.mongo;


var mongoConnectOptions = {
    uri_decode_auth: false,
    db: {
        native_parser: true,
        authSource: 'admin',
    },
    server: {
        ssl: false,
        // sslCA: '/etc/ssl/mongodb/ca.crt',
        // sslValidate: false
    }
};


function ngridWrapper(mongoUrl, mongoOptions, log) {
    return Promise(
        function (resolve, reject) {
            new NGrid(resolve, reject, mongoUrl, mongoOptions, log);
        }
    );
};
module.exports = ngridWrapper;


function NGrid(resolve, reject, mongoUrl, mongoOptions, log) {
    var thisNGrid = this;
    this.events = new EventEmitter();
    this._gfs = null;
    this._mongoUrl = mongoUrl || 'mongodb://localhost:27017/';
    this.log = log || {
            trace: console.log,
            debug: console.log,
            info: console.log,
            warn: console.error,
            error: console.error,
            fatal: console.error
        };
    this._mongoConnectOptions = mongoOptions || {};
    this._initialConnectSuccess = false;
    this._mongoConnection = mongoose.createConnection(thisNGrid._mongoUrl, thisNGrid._mongoConnectOptions);
    this._mongoConnection.once(
        'open',
        function () {
            thisNGrid._gfs = Grid(thisNGrid._mongoConnection.db);
            thisNGrid.log.debug('NGrid.create GridFS connected');
            thisNGrid.events.emit('open', thisNGrid);
            thisNGrid._initialConnectSuccess = true;
            return resolve(thisNGrid);
        }
    );
    this._mongoConnection.on(
        'error',
        function (err) {
            if (err !== null) {
                thisNGrid.log.error('NGrid.create GridFS/Mongoose ERROR', err);
                thisNGrid.events.emit('error', err);
                if (thisNGrid._initialConnectSuccess === false) {
                    // process.exit(17);
                    return reject(err);
                }
            }
        }
    );
}


NGrid.prototype.remove = function (options) {
    var thisNGrid = this;
    return Promise(
        function (resolve, reject, notify) {
            thisNGrid._gfs.remove(options, function (err) {
                    if (err) {
                        thisNGrid.log.error('NGrid.remove ERROR /ngrid/', err);
                        return reject(err);
                    }
                    thisNGrid.log.debug('NGrid.remove COMPLETE /ngrid/');
                    thisNGrid.events.emit('remove', {options: options, err: err});
                    return resolve(options);
                }
            );
        }
    );
};


NGrid.prototype.find = function (options) {
    var thisNGrid = this;
    return Promise(
        function (resolve, reject, notify) {
            thisNGrid._gfs.files.find(options).toArray(
                function (err, files) {
                    if (err) {
                        thisNGrid.log.error('NGrid.find ERROR /ngrid/', err);
                        return reject(err);
                    }
                    thisNGrid.log.debug('NGrid.find /ngrid/ found:', files.length);
                    return resolve(files);
                }
            )
        }
    );
};

NGrid.prototype.createId = function () {
    return new mongoose.mongo.ObjectId();
};

NGrid.prototype.write = function (options, inlet) {
    var thisNGrid = this;
    return Promise(
        function (resolve, reject, notify) {
            //var aliases = (options.aliases) ? null : options.aliases;
            var incomingStream = toStream(inlet);

            options = options || {};
            options.mode = 'w';
            options._id = options._id || thisNGrid.createId();

            var writeStream = thisNGrid._gfs.createWriteStream(options);

            incomingStream.pipe(writeStream);
            writeStream.on(
                'close',
                function (file) {
                    thisNGrid.log.debug('NGrid.write /ngrid/ done: ' + file._id);
                    return resolve(file);
                }
            );
        }
    );
};


NGrid.prototype.read = function (query, outlet) {
    var thisNGrid = this;
    outlet = outlet || new StreamBuffer();
    var readstream = thisNGrid._gfs.createReadStream(query);
    var writtenData = 0;
    return Promise(
        function (resolve, reject, notify) {
            readstream.on(
                'data',
                function (data) {
                    writtenData += data.length;
                    outlet.write(data);
                    notify(writtenData);
                }
            );
            readstream.on(
                'end',
                function () {
                    thisNGrid.log.debug('NGrid.read COMPLETE /ngrid/');
                    if (outlet instanceof StreamBuffer) {
                        return resolve(outlet.getBuffer());
                    }
                    return resolve(outlet);
                }
            );
            readstream.on(
                'error',
                function (err) {
                    thisNGrid.log.error('NGrid.read ERROR /ngrid/', err);
                    return reject(err);
                }
            );
        }
    );
};


function StreamBuffer() {
    this._chunks = [];
    this.data = null;
};


StreamBuffer.prototype.write = function (data) {
    this._chunks.push(data);
    return this.data;
};


StreamBuffer.prototype.getBuffer = function () {
    this._buffer = Buffer.concat(this._chunks);
    return this._buffer;
};


