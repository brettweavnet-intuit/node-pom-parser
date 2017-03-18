/** @module Node Pom Parser */

"use strict";

var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var xml2js = require("xml2js");
var traverse = require('traverse');

// xmljs options https://github.com/Leonidas-from-XIV/node-xml2js#options
var XML2JS_OPTS = {
  trim: true,
  normalizeTags: true,
  normalize: true,
  mergeAttrs: true
};

/**
 * Parses xml into javascript object by using a file path or an xml content.
 * @param {object} opt Is the option with the filePath or xmlContent and the optional format.
 * @return {object} The pom object along with the timers.
 */
module.exports.parse = function(opt, cb) {
  var resolve, reject;

  const callback = (cb)? cb : function(){/*noop*/};
  const promise = new Promise(function(res, rej) {
    resolve = res; reject = rej;
  });

  if (!opt) {
    throw new Error("You must provide options: opt.filePath and any other option of " +
      "https://github.com/Leonidas-from-XIV/node-xml2js#options");
  }
  if (!opt.xmlContent && !opt.filePath) {
    throw new Error("You must provide the opt.filePath or the opt.xmlContent");
  }


  // If the xml content is was not provided by the api client.
  // https://github.com/petkaantonov/bluebird/blob/master/API.md#error-rejectedhandler----promise
  if (!opt.xmlContent) {
    fs.readFileAsync(opt.filePath, "utf8").then(function(xmlContent) {
      return xmlContent;

    }).then(_parseWithXml2js).then(function(result) {
      resolve(result);
      callback(null, result);

    }).catch(function(e) {
      reject(e);
      callback(e, null);
 
    }).error(function (e) {
      reject(e);
      callback(e, null);
    });

  } else {
    // parse the xml provided by the api client.
    _parseWithXml2js(opt.xmlContent).then(function(result) {
      delete result.xmlContent;
      resolve(result);
      callback(null, result);

    }).error(function (e) {
      reject(e);
      callback(e);
    });
  }
  return promise;

};

/**
 * Parses the given xml content.
 * @param xmlContent {string} Is the xml content in string using utf-8 format.
 * @param loadedXml {boolean} Whether the xml was loaded from the file-system.
 * @param callback {function} The callback function using Javascript PCS.
 */
function _parseWithXml2js(xmlContent) {
  return new Promise(function(resolve, reject) {
    // parse the pom, erasing all
    xml2js.parseString(xmlContent, XML2JS_OPTS, function(err, pomObject) {
      if (err) {
        // Reject with the error
        reject(err);
      }

      // Replace the arrays with single elements with strings
      removeSingleArrays(pomObject);

      // Response to the call
      resolve({
        pomXml: xmlContent, // Only add the pomXml when loaded from the file-system.
        pomObject: pomObject // Always add the object
      });
    });
  });
}

/**
 * Removes all the arrays with single elements with a string value.
 * @param {object} o is the object to be traversed.
 */
function removeSingleArrays(obj) {
  // Traverse all the elements of the object
  traverse(obj).forEach(function traversing(value) {
    // As the XML parser returns single fields as arrays.
    if (value instanceof Array && value.length === 1) {
      this.update(value[0]);
    }
  });
}
