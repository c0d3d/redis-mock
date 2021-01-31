var should = require("should");
var events = require("events");
var helpers = require("../helpers");

var r;

beforeEach(function () {
  r = helpers.createClient();
});

afterEach(function () {
  r.flushall();
});

describe("xadd", function () {

  it("Should error with wrongtype if the value is not a stream", function(done) {
    r.set("mykey", 1, function(err, result) {
      r.xadd('mykey', "*", "A", "B", function(err, result) {
        should.not.exist(result);
        err.message.should.equal("WRONGTYPE Operation against a key holding the wrong kind of value");
        done();
      });
    });
  });

  it("Should create and return a new ID when asked", function(done) {
    r.xadd('mykey', "*", "A", "B", function(err, result) {
      result.should.match(/^\d+-0$/);
      done();
    });
  });
});
