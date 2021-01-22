"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function node_ajax() {
  return function (mkHeader, options) {
    return function (errback, callback) {
      function fixupUrl(url) {
        var urllib = module.require("url");

        var u = urllib.parse(url);
        u.protocol = u.protocol || "http:";
        u.hostname = u.hostname || "localhost";
        return urllib.format(u);
      }

      var XHR = module.require("xhr2-cookies").XMLHttpRequest;

      var xhr = new XHR();
      var fixedUrl = fixupUrl(options.url);
      xhr.open(options.method || "GET", fixedUrl, true, options.username, options.password);

      if (options.headers) {
        try {
          for (var i = 0, header; (header = options.headers[i]) != null; i++) {
            xhr.setRequestHeader(header.field, header.value);
          }
        } catch (e) {
          errback(e);
        }
      }

      var onerror = function onerror(msg) {
        return function () {
          errback(new Error(msg + ": " + options.method + " " + options.url));
        };
      };

      xhr.onerror = onerror("AJAX request failed");
      xhr.ontimeout = onerror("AJAX request timed out");

      xhr.onload = function () {
        callback({
          status: xhr.status,
          statusText: xhr.statusText,
          headers: xhr.getAllResponseHeaders().split("\r\n").filter(function (header) {
            return header.length > 0;
          }).map(function (header) {
            var i = header.indexOf(":");
            return mkHeader(header.substring(0, i))(header.substring(i + 2));
          }),
          body: xhr.response
        });
      };

      xhr.responseType = options.responseType;
      xhr.withCredentials = options.withCredentials;
      xhr.send(options.content);
      return function (error, cancelErrback, cancelCallback) {
        try {
          xhr.abort();
        } catch (e) {
          return cancelErrback(e);
        }

        return cancelCallback();
      };
    };
  };
}

function browser_ajax() {
  return function (mkHeader, options) {
    return function (errback, callback) {
      var controller = new AbortController();
      var signal = controller.signal;

      function mapHeaders(headers) {
        var result = [];

        var _iterator = _createForOfIteratorHelper(headers.entries()),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var pair = _step.value;

            if (pair[0] && pair[1]) {
              result.push(mkHeader(pair[0])(pair[1]));
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return result;
      }

      var headers = new Headers();

      if (options.headers) {
        try {
          for (var i = 0, header; (header = options.headers[i]) != null; i++) {
            if (header.field && header.value) {
              headers.append(header.field, header.value);
            }
          }
        } catch (e) {
          errback(e);
        }
      }

      if (options.username && options.password) {
        headers.set('Authorization', 'Basic ' + btoa("".concat(options.username, ":").concat(options.password)));
      } // ignore responsetype. fetch has no interface for it.


      fetch(options.url || "/", {
        method: options.method || "GET" // Map the boolean given for withCredentials as follows:
        // false -> same-origin
        // true -> include
        ,
        credentials: options.withCredentials ? "include" : "same-origin",
        headers: headers,
        body: options.content,
        signal: signal // No way to set the "same-origin" mode.
        ,
        mode: options.withCredentials ? "cors" : "no-cors"
      }).then(function (response) {
        response.text().then(function (t) {
          return callback({
            status: response.status,
            statusText: response.statusText,
            headers: mapHeaders(response.headers),
            body: t
          });
        });
      })["catch"](function (msg) {
        errback(new Error(msg + ": " + options.method + " " + options.url));
      }); // no specific handler for timeout, or abort.

      return function (error, cancelErrback, cancelCallback) {
        try {
          controller.abort();
        } catch (e) {
          return cancelErrback(e);
        }

        return cancelCallback();
      };
    };
  };
}

var inBrowser = new Function("{ try { return this===window; } catch(e) { try { return this===self; } catch(e) { return false; } } }");
exports._ajax = inBrowser() ? browser_ajax() : node_ajax();
