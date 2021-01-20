"use strict";

function node_ajax()
{
  return function (mkHeader, options) {
    return function (errback, callback) {

      function fixupUrl (url) {
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
      var onerror = function (msg) {
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
          headers: xhr.getAllResponseHeaders().split("\r\n")
            .filter(function (header) {
              return header.length > 0;
            })
            .map(function (header) {
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

function browser_ajax()
{
  return function (mkHeader, options)
  {
    return function (errback, callback)
    {
      const controller = new AbortController();
      const { signal } = controller;

      const onerror = function (msg) {
        return function () {
          errback(new Error(msg + ": " + options.method + " " + options.url));
        };
      };

      function mapHeaders (headers)
      {
        const result = [];
        for (var pair of headers.entries())
        {
          result.push( mkHeader( pair[0], pair[1]));
        }
        return result;
      }
      let headers = new Headers();
      if (options.headers) {
        try {
          for (var i = 0, header; (header = options.headers[i]) != null; i++)
          {
            headers.append( header.field, header.value );
          }
        } catch (e) {
          errback(e);
        }
      }
      if (options.username && options.password)
      {
        headers.set('Authorization', 'Basic ' + btoa( `${options.username}:${options.password}` ));
      }
      // ignore responsetype. fetch has no interface for it.
      fetch(options.url || "/",
        { method: options.method || "GET"
          // Map the boolean given for withCredentials as follows:
          // false -> same-origin
          // true -> include
        , credentials: options.withCredentials ? "include" : "same-origin"
        , headers: headers
        , body: options.content
        , signal
        // No way to set the "same-origin" mode.
        , mode: options.withCredentials ? "cors" : "no-cors"
        })
        .then( function( response )
          {
            response.text()
              .then(t => callback(
                { status: response.status
                , statusText: response.statusText
                , headers: mapHeaders( response.headers )
                , body: t
              }));
          })
        // no specific handler for timeout, or abort.
        .catch( onerror );

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

const inBrowser=new Function("{ try { return this===window; } catch(e) { try { return this===self; } catch(e) { return false; } } }");

exports._ajax = inBrowser() ? browser_ajax() : node_ajax();
