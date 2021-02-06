var helpers = require('../helpers.js');
var Item = require('./item.js');

function isStream(inst, key, cb) {
  return helpers.validKeyType(inst, key, 'stream', cb);
}

function ensureStream(inst, key) {
  return helpers.initKey(inst, key, Item.createStream);
}

function idCmp(x, y) {
  var xComps = x.id.split("-");
  var yComps = y.id.split("-");

  var xyTimeDiff = parseInt(xComps[0], 10) - parseInt(yComps[0], 10);
  if (xyTimeDiff === 0) {
    // Must compare counters
    return parseInt(xComps[1], 10) - parseInt(yComps[1], 10);
  } else {
    return xyTimeDiff;
  }
}

var lastId = -1;
var idCounter = 0;

function newId() {
  // TODO
  // This does not 100% mimic the real behavior in the edge case
  // layed out in the documentation (with the clock moving backwards).
  var now = new Date().getTime();

  if (lastId === now) {
    idCounter++;
  } else {
    lastId = now;
    idCounter = 0;
  }

  return now.toString() + "-" + idCounter;
}

function validValues(kvPairs) {
  // "node_redis: The XADD command contains a invalid argument type.\n"
  //   + "Only strings, dates and buffers are accepted. Please update your code to use valid argument types.";

}

/**
 * Binary search that returns the index for an equal (or closest, greater side)
 * value.
 */
function bSearchIdx(arr, v) {

  var begin = 0;
  var end = arr.length - 1;

  while (begin <= end) {
    var avg = (begin + end) / 2;
    var center = Math.floor(avg);

    var comparison = idCmp(arr[center], v);

    if (comparison === 0) {
      return center; // Yay!
    } else if (comparison < 0) {
      begin = center + 1;
    } else {
      end = center - 1;
    }
  }

  // Need to watch for v being larger then all others.
  return Math.min(begin, arr.length - 1);
}

function validValueType(v) {
  return Buffer.isBuffer(v)
    || (v.toString() !== "[object Object]" && !Array.isArray(v));
}

function kvInfo(kvPairs) {
  if (kvPairs.length % 2 !== 0) {
    return { mismatched: true };
  }

  var result = {};

  kvPairs.forEach(function(v) {
    if (!validValueType(v)) {
      result.badValue = true;
    }

    if (Buffer.isBuffer(v)) {
      result.hasBuffer = true;
    }
  });

  return result;
}

function serializeKv(kvPairs) {
  return kvPairs.map(function (v) {
    return Buffer.isBuffer(v) ? v : v.toString();
  });
}

exports.xadd = function(
  key,
  sizeRestriction,
  id,
  kvPairs,
  maybeCb
) {

  var cb = maybeCb || helpers.mockCallback;

  if (kvPairs.length <= 1) {
    return helpers.callCallback(cb, new Error("ERR wrong number of arguments for 'xadd' command"));
  }

  var info = kvInfo(kvPairs);

  if (info.mismatched) {
    return helpers.callCallback(cb, new Error("ERR wrong number of arguments for XADD"));
  }

  if (info.badValue) {
    return helpers.callCallback(cb, new Error(
      "node_redis: The XADD command contains a invalid argument type.\n"
        + "Only strings, dates and buffers are accepted. Please update your code to use valid argument types."));
  }

  if (!isStream(this, key, maybeCb)) {
    return null;
  }

  ensureStream(this, key);

  if (id === "*") {
    id = newId();
  } else if (/^\d+$/.test(id)) {
    id = id + "-0";
  } else if (!/^\d+-\d+$/.test(id)) {

    return helpers.callCallback(cb, new Error("ERR Invalid stream ID specified as stream command argument"));
  }

  var s = this.storage[key].value;

  if (s.length === 0 || idCmp(s[s.length - 1], { id: id }) < 0) {
    s.push({
      id: id,
      kvPairs: serializeKv(kvPairs)
    });
    return helpers.callCallback(cb, null, info.hasBuffer ? Buffer.from(id) : id);
  } else {
    return helpers.callCallback(cb, new Error(
      "ERR The ID specified in XADD is equal or smaller than the target stream top item"));
  }
};

exports.xrange = function(
  key,
  start,
  end,
  count,
  maybeCb
) {
  var cb = maybeCb || helpers.mockCallback;

  if (!isStream(this, key, maybeCb)) {
    return;
  }

  if (!this.storage[key].value) {
    // TODO(NR) this is probably wrong
    helpers.callCallback(cb, null, []);
  }

  var s = this.storage[key].value;

  var startId;
  var endId;

  // TODO need to deal with special case of nothing in stream?

  if (start === '+') {
    startId = s[s.length - 1];
  } else if (start === "-") {
    startId = s[0];
  } else {
    startId = { id: start };
  }

  if (end === '+') {
    endId = s[s.length - 1];
  } else if (end === '-') {
    endId = s[0];
  } else {
    endId = { id: end };
  }


};
