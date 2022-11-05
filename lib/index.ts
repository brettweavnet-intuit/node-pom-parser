"use strict";

import fs from 'fs';
import xml2js, { Options } from 'xml2js';
import traverse from 'traverse';

// xmljs options https://github.com/Leonidas-from-XIV/node-xml2js#options
var XML2JS_OPTS = {
  trim: true,
  normalizeTags: true,
  normalize: true,
  mergeAttrs: true
};

interface ParsedOutput {
  pomXml: string;
  pomObject: object;
  xmlContent?: string;
}

type ParseOptions = ({ filePath?: string; xmlContent?: string, xmlOptions?: Options }) | null

type ParseCallback = (e: Error | null, r?: ParsedOutput | null) => void;

/**
 * This method exposes an `async/await` syntax to the older
 * `parse` method and allows you to call the method with just
 * one argument.
 * 
 * @param {ParseOptions} opt the options to be used for parsing
 * 
 * @returns {Promise<ParsedOutput>} a `Promise` that holds the parsed output
 */
export async function parseAsync(opt: ParseOptions): Promise<ParsedOutput> {
  if (!opt) {
    throw new Error("You must provide options: opt.filePath and any other option of " + "https://github.com/Leonidas-from-XIV/node-xml2js#options");
  }

  if (!opt.xmlContent && !opt.filePath) {
    throw new Error("You must provide the opt.filePath or the opt.xmlContent");
  }

  const xmlOptions = opt.xmlOptions ?? XML2JS_OPTS;

  if (opt.filePath) {
    const xmlContent = await readFileAsync(opt.filePath, "utf8")
    const result = await _parseWithXml2js(xmlContent, xmlOptions);
    return result;
  }

  const result = await _parseWithXml2js(opt.xmlContent || '', xmlOptions);
  delete result.xmlContent;
  return result;
}

/**
 * Parses xml into javascript object by using a file path or an xml content.
 * @param {object} opt Is the option with the filePath or xmlContent and the optional format.
 * @return {object} The pom object along with the timers.
 */
function parse(opt: ParseOptions, callback: ParseCallback): void {
  if (!opt) {
    throw new Error("You must provide options: opt.filePath and any other option of " + "https://github.com/Leonidas-from-XIV/node-xml2js#options");
  }

  if (!opt.xmlContent && !opt.filePath) {
    throw new Error("You must provide the opt.filePath or the opt.xmlContent");
  }

  const xmlOptions = opt.xmlOptions ?? XML2JS_OPTS;

  // If the xml content is was not provided by the api client.
  // https://github.com/petkaantonov/bluebird/blob/master/API.md#error-rejectedhandler----promise
  if (opt.filePath) {
    readFileAsync(opt.filePath, "utf8").then(function (xmlContent) {
      return xmlContent;
    }).then(function (content) {
      return _parseWithXml2js(content, xmlOptions);
    }).then(function (result) {
      callback(null, result);
    }).catch(function (e) {
      callback(e, null);
    });

  } else if (opt.xmlContent) {
    // parse the xml provided by the api client.
    _parseWithXml2js(opt.xmlContent, xmlOptions).then(function (result) {
      delete result.xmlContent;
      callback(null, result);

    }).catch(function (e) {
      callback(e);
    });
  }

};

/**
 * Parses the given xml content.
 * @param xmlContent {string} Is the xml content in string using utf-8 format.
 * @param xmlOptions {Options} Are the XML2JS options passed to the parser.
 * @param loadedXml {boolean} Whether the xml was loaded from the file-system.
 * @param callback {function} The callback function using Javascript PCS.
 */
function _parseWithXml2js(xmlContent: string, xmlOptions: Options): Promise<ParsedOutput> {
  return new Promise(function (resolve, reject) {
    // parse the pom, erasing all
    xml2js.parseString(xmlContent, xmlOptions, function (err, pomObject) {
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
function removeSingleArrays(obj: Object): void {
  // Traverse all the elements of the object
  traverse(obj).forEach(function traversing(value) {
    // As the XML parser returns single fields as arrays.
    if (value instanceof Array && value.length === 1) {
      this.update(value[0]);
    }
  });
}

function readFileAsync(path: string, encoding: BufferEncoding | undefined): Promise<string> {
  return new Promise((resolve, reject) =>
    fs.readFile(path, { encoding }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        data instanceof Buffer
          ? resolve(data.toString(encoding))
          : resolve(data);
      }
    })
  );
}

export default parse;