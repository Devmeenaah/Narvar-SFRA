'use strict';

window.jQuery = require('jquery');
window.$ = window.jQuery;

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./deliveryPromise/deliveryPromise'));
});

require('base/thirdParty/bootstrap');
require('base/components/spinner');
