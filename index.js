'use strict';
var through = require('through2');
var path = require('path');
var File = require('vinyl');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var requestRetry = require('requestretry');

var PLUGIN_NAME = 'gulp-rollbar';
var API_URL = 'https://api.rollbar.com/api/1/sourcemap';

/**
 * Upload the sourcemap file to Rollbar on build (pre-deploy).
 *
 * @param {Object} options Rollbar settings such as `accessToken`, `version`, etc.
 * @see https://rollbar.com/docs/source-maps/
 */
function rollbar(options) {
  options = options || {};

  if (!options.accessToken) {
    throw new PluginError(PLUGIN_NAME, 'Missing `accessToken`!');
  }
  if (!options.version) {
    throw new PluginError(PLUGIN_NAME, 'Missing `version`!');
  }
  if (!options.sourceMappingURLPrefix) {
    throw new PluginError(PLUGIN_NAME, 'Missing `sourceMappingURLPrefix`!');
  }

  function postSourcemap(file, encoding, callback) {
    /*jshint validthis:true, camelcase:false*/

    if (file.isNull() || !file.sourceMap) {
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(new Error(PLUGIN_NAME + '-write: Streaming not supported'));
    }

    var sourceMap = file.sourceMap;

    // fix paths if Windows style paths
    sourceMap.file = unixStylePath(file.relative);
    sourceMap.sources = sourceMap.sources.map(function (filePath) {
      return unixStylePath(filePath);
    });

    var formData = {
      access_token: options.accessToken,
      version: options.version,
      minified_url: [options.sourceMappingURLPrefix, sourceMap.file].join('/'),
      source_map: {
        value: new Buffer(JSON.stringify(sourceMap)),
        options: {
          filename: [sourceMap.file, 'map'].join('.'),
          contentType: 'application/octet-stream'
        }
      }
    };

    function retryStrategyWithLog(err, response) {
      // Uses default strategy but use custom strategy to trigger logs.
      if (err || response.statusCode != 200) {
        gutil.log('Retrying failed rollbar sourcemap upload: ' + err);
      }
      return requestRetry.RetryStrategies.HTTPOrNetworkError(err, response);
    }

    requestRetry(
      {
        url: API_URL,
        method: 'POST',
        formData: formData,
        maxAttempts: 10,
        retryStrategy:retryStrategyWithLog
      }, function (err, httpResponse, body) {
      if (err) {
        throw new PluginError(PLUGIN_NAME, err, {showStack: true});
      }

      if (httpResponse.statusCode === 200) {
        gutil.log(formData.source_map.options.filename + ' uploaded successfully to Rollbar');
      } else {
        var message = JSON.parse(body).message;
        gutil.log('Failed to upload sourcemap file to Rollbar. Server responded', httpResponse.statusCode, 'with error `' + message + '`');
      }

      callback(null, file);
    });
  }

  return through.obj(postSourcemap);
}

function unixStylePath(filePath) {
  return filePath.split(path.sep).join('/');
}

module.exports = rollbar;
