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

exports.xadd = function(
  key,
  sizeRestriction,
  id,
  kvPairs,
  maybeCb
) {

  var cb = maybeCb || helpers.mockCallback;

  // TODO(NR) check how malformed ID is treated.
  // TODO(NR) check how user specified ID that is < existing is treated.

  if (!isStream(this, key, maybeCb)) {
    return;
  }

  ensureStream(this, key);

  if (id === "*") {
    id = newId();
  }

  var s = this.storage[key].value;

  // This is the fast check
  if (s.length === 0 || idCmp(s[s.length - 1], id) < 0) {
    s.push({
      id: id,
      kvPairs: kvPairs
    });
  } else {
    // TODO figure this out.
  }

  helpers.callCallback(cb, null, id);

};

exports.xrange = function() {

};
