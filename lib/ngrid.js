var Buffer = require('buffer');
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
		function(resolve, reject) {
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
			thisNGrid._gfs = Grid(thisNGrid.mongoConnection.db);
			thisNGrid.log.debug('GridFS connected');
			thisNGrid.events.emit('open', thisNGrid);
			this._initialConnectSuccess = true;
			return resolve(thisNGrid);
		}
	);
	this._mongoConnection.on(
		'error', 
		function (err) {
			if (err !== null) {
				thisNGrid.log.error('Mongoose ERROR', err);
				thisNGrid.events.emit('error', err);
				if (thisNGrid._initialConnectSuccess === false) {
					// process.exit(17);
					return reject(err);
				}
			}
		}
	);
}


NGrid.prototype.remove = function(filename) {
	var thisNGrid = this;
	return Promise(
		function(resolve, reject, notify) {
			thisNGrid._gfs.remove(
				{ 
					filename: filename 
				},
				function(err) {
					if (err) {
						thisNGrid.log.error('REQUEST: ERROR remove /ngrid/' + filename, err);
						return reject(err);
					}
					thisNGrid.log.debug('REQUEST: COMPLETE remove /ngrid/' + filename);
					thisNGrid.events.emit('remove', { filename: filename, err: err });
					return resolve('removed ' +filename);
				}
			);
		}
	);
};


NGrid.prototype.find = function(filename) {
	var thisNGrid = this;
	return Promise(
		function(resolve, reject, notify) {
			thisNGrid.files.find(
				{ 
					filename: filename 
				}
			).toArray(
				function (err, files) {
					if (err) {
						thisNGrid.log.error('REQUEST: ERROR find /ngrid/' + filename, err);
						return reject(err);
					}
					log.debug('REQUEST: PROGRESS find /ngrid/' + filename + '  found:', files.length, files);
					return resolve(files);
				}
			)
		}
	);
};


NGrid.prototype.write = function(filename, incomingStream, options) {
	var thisNGrid = this;
	return Promise(
		function(resolve, reject, notify) {
			var data = {
				mode: 'w'
			};
			if (!filename) {
				return reject(new Error('NGrid.write - not filename given'));
			}
			data._id = (options._id) ? options._id : new mongoose.mongo.ObjectId();
			if (options.content_type) {
				data.content_type = options.content_type;
			}
			if (options.metaData) {
				data.metaData = options.metaData;
			}
			var writeStream = app.gfs.createWriteStream(
				data
			);
			incoming.pipe(writeStream);
			writeStream.on(
				'close',
				function() {
					return resolve(data);
				}
			);
		}
	);
};


NGrid.prototype.read = function(filename, outlet, start, end) {
	var thisNGrid = this;
	var query = {
		filename: filename
	};
	if (typeof start !== 'undefined' && typeof end !== 'undefined') {
		query.range = {
			startPos: start,
			endPos: end
		};
	}
	// todo ... create writeBuffer
	outlet = outlet || new StreamBuffer();
	var readstream = thisNGrid._gfs.createReadStream(
		query
	);
	var writtenData = 0;
	return Promise(
		function(resolve, reject, notify) {
			readstream.on(
				'data', 
				function(data) {
					writtenData += data.length;
					outlet.write(data);
					notify(writtenData);
				}
			);
			readstream.on(
				'end', 
				function() {
					thisNGrid.log.debug('REQUEST: COMPLETE read /ngrid/' + filename);
					outlet.end();
					resolve(outlet);					
				}
			);
			readstream.on(
				'error', 
				function (err) {
					thisNGrid.log.error('REQUEST: ERROR read /ngrid/' + filename, err);
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


StreamBuffer.prototype.write = function(data) {
	this._chunks.push(data);
	return this.data;
};


StreamBuffer.prototype.end = function() {
	this._buffer = Buffer.concat(this.buffers);
	return this.data;
};


