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

  it("Should create and return a new ID", function(done) {
    r.xadd('mykey', "*", "A", "B", function(err, result) {
      result.should.match(/^\d+-0$/);
      done();
    });
  });

  it("Should not accept an odd number of values", function(done) {
    r.xadd('mykey', '*', "a", "b", "c", function(err, result) {
      should.not.exist(result);
      err.message.should.equal("ERR wrong number of arguments for XADD");
      done();
    });
  });

  it("Should error for single key no value", function(done) {
    r.xadd('mykey', '*', "a", function(err, result) {
      should.not.exist(result);
      err.message.should.equal("ERR wrong number of arguments for 'xadd' command");
      done();
    });
  });

  it("Should error for no keys and no values", function(done) {
    r.xadd('mykey', '*', function(err, result) {
      should.not.exist(result);
      err.message.should.equal("ERR wrong number of arguments for 'xadd' command");
      done();
    });
  });

  it("Should not accept objects as values", function(done) {
    r.xadd('mykey', '*', "A", { b: 1 }, function(err, result) {
      should.not.exist(result);
      err.message.should.equal(
        "node_redis: The XADD command contains a invalid argument type.\n"
          + "Only strings, dates and buffers are accepted. Please update your code to use valid argument types.");
      done();
    });
  });

  it("Should not accept objects as keys", function(done) {
    r.xadd('mykey', '*', { b: 1 }, "A", function(err, result) {
      should.not.exist(result);
      err.message.should.equal(
        "node_redis: The XADD command contains a invalid argument type.\n"
          + "Only strings, dates and buffers are accepted. Please update your code to use valid argument types.");
      done();
    });
  });

  it("Should allow buffers as keys", function(done) {
    r.xadd('mykey', '*', "A", Buffer.alloc(10), function(err, result) {
      result.should.be.instanceof(Buffer);
      result.toString().should.match(/^\d+-0$/);
      done();
    });
  });

  it("Should accept a user specified key", function(done) {
    r.xadd('mykey', '1-0', "A", "B", function(err, result) {
      result.should.equal("1-0");
      done();
    });
  });

  it("Should accept a user specified key without a seq number", function(done) {
    r.xadd('mykey', '10', "A", "B", function(err, result) {
      result.should.equal("10-0");
      done();
    });
  });

  it("Should not accept a malformed key (too many dashes)", function(done) {
    r.xadd('mykey', '10-0-0', "A", "B", function(err, result) {
      should.not.exist(result);
      err.message.should.equal("ERR Invalid stream ID specified as stream command argument");
      done();
    });
  });

  it("Should not accept a malformed key (not a number)", function(done) {
    r.xadd('mykey', 'woops10-0', "A", "B", function(err, result) {
      should.not.exist(result);
      err.message.should.equal("ERR Invalid stream ID specified as stream command argument");
      done();
    });
  });

  it("Should not accept a user specified ID that is not at the end", function(done) {
    r.xadd('mykey', '*', "A", "B", function(err, result) {
      result.should.match(/^\d+-0$/);
      r.xadd('mykey', '1-0', "B", "C", function (err, result) {
        err.message.should.equal(
          "ERR The ID specified in XADD is equal or smaller than the target stream top item");
        done();
      });
    });
  });

});
