var fs = require('fs');
var Q = require('q');
var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.use(sinonChai);
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var NGrid = require('../lib/ngrid');

describe(
    'ngrid.create',
    function () {
        it(
            'creates a ngrid instance',
            function () {
                var thisPromise = NGrid(
                ).then(
                    function (thisNGrid) {
                        ngrid = thisNGrid;
                    }
                ).then(
                    function () {
                        expect(ngrid._gfs).to.not.eq(null);
                        expect(ngrid._initialConnectSuccess).to.eq(true);
                        expect(ngrid.remove).to.be.a('function');
                        expect(ngrid.read).to.be.a('function');
                        expect(ngrid.write).to.be.a('function');
                        expect(ngrid.find).to.be.a('function');
                        expect(ngrid.events).to.be.a('object');
                        expect(ngrid.events.on).to.be.a('function');
                        return ngrid;
                    }
                ).catch(
                    function (err) {
                        console.error('####### ERROR ##### ', err.stack || err);
                        process.exit(1);
                    }
                );
                return thisPromise;
            }
        );
    }
);


describe(
    'ngrid.write',
    function () {
        it(
            'writes a file to a ngrid instance',
            function () {
                var incomingStream = fs.createReadStream(__dirname + '/test.js');
                var fileName = 'ngrid_tests_test.js';
                var options = {
                    content_type: 'application/javascript',
                    metadata: {
                        tags: ['ngridTest']
                    }
                };
                var thisPromise = ngrid.write(
                    fileName, incomingStream, options
                ).then(
                    function (file) {
                        expect(file.filename).to.eq(fileName);
                        expect(file._id).to.be.a('object');
                        return file;
                    }, null, function (notification) {
                        expect(notification._id).not.to.be.null;
                        expect(notification._id).not.to.be.undefined;
                    }
                ).catch(
                    function (err) {
                        console.error('####### ERROR ##### ', err.stack || err);
                        process.exit(1);
                    }
                );
                return thisPromise;
            }
        );
    }
);


describe(
    'ngrid.find',
    function () {
        it(
            'finds files by filename in a ngrid instance',
            function () {
                var fileName = 'ngrid_tests_test.js';
                var thisPromise = ngrid.find(
                    fileName
                ).then(
                    function (files) {
                        expect(files).to.be.a('Array');
                        expect(files.length).to.be.above(0);
                        expect(files[0]).to.be.a('object');
                        expect(files[0].filename).to.eq(fileName);
                        return files;
                    }
                ).catch(
                    function (err) {
                        console.error('####### ERROR ##### ', err.stack || err);
                        process.exit(1);
                    }
                );
                return thisPromise;
            }
        );
    }
);


describe(
    'ngrid.read.intoBuffer',
    function () {
        it(
            'reads a file by filename from a ngrid instance',
            function () {
                var fsFileBuffer = fs.readFileSync(__dirname + '/test.js');
                var fileName = 'ngrid_tests_test.js';
                var thisPromise = ngrid.read(
                    fileName//, outlet //, start, end
                ).then(
                    function (ngridFileBuffer) {
                        expect(ngridFileBuffer instanceof Buffer).to.eq(true);
                        expect(ngridFileBuffer.equals(fsFileBuffer)).to.eq(true);
                        return ngridFileBuffer;
                    }
                ).catch(
                    function (err) {
                        console.error('####### ERROR ##### ', err.stack || err);
                        process.exit(1);
                    }
                );
                return thisPromise;
            }
        );
    }
);


describe(
    'ngrid.remove',
    function () {
        it(
            'removes a file by filename from a ngrid instance',
            function () {
                var fileName = 'ngrid_tests_test.js';
                var thisPromise = ngrid.remove(
                    fileName
                ).then(
                    function (filename) {
                        expect(filename).to.eq(fileName);
                        return filename;
                    }
                ).catch(
                    function (err) {
                        console.error('####### ERROR ##### ', err.stack || err);
                        process.exit(1);
                    }
                );
                return thisPromise;
            }
        );
    }
);


