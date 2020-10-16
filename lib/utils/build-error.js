'use strict';

const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const broccoliMiddlewarePath = path.dirname(require.resolve('broccoli-middleware/package'));
const errorTemplatePath = path.join(broccoliMiddlewarePath, 'lib/templates/error.html');
const errorTemplate = handlebars.compile(fs.readFileSync(errorTemplatePath).toString());
const { toVersionString } = require('broccoli-middleware/lib/utils/error-handler-utils');

function populateTemplate(error, options = {}) {
  const context = {
    stack: error.broccoliPayload.error.stack,
    broccoliBuilderErrorStack: error.stack,
    instantiationStack: error.broccoliPayload.instantiationStack,
    errorMessage: error.message,
    liveReloadPath: options.liveReloadPath,
    codeFrame: error.broccoliPayload.error.codeFrame,
    nodeName: error.broccoliPayload.broccoliNode.nodeName,
    nodeAnnotation: error.broccoliPayload.broccoliNode.nodeAnnotation,
    errorType: error.broccoliPayload.error.errorType,
    location: error.broccoliPayload.error.location,
    versionString: toVersionString(error.broccoliPayload.versions || {})
  };

  return errorTemplate(context);
}

module.exports = populateTemplate;
