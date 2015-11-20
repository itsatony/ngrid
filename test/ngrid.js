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
	function() {
		it(
			'creates a ngrid instance', 
			function() {
				var thisPromise = NGrid()
					.then(
						function(thisNGrid) {
							ngrid = thisNGrid;
						}
					).then(
						function() {
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
						function(err) {
							console.error('####### ERROR ##### ', err.stack || err);
							process.exit(1);
						}
					)
				;
				return thisPromise;
			}
		);
	}
);