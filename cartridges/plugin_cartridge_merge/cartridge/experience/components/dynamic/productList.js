'use strict';

// eslint-disable-next-line no-unused-vars
/* global request */

var HashMap = require('dw/util/HashMap');
var overlayHelper = require('~/cartridge/scripts/overlayHelper');

/**
 * Render logic for the product list component
 * @param {dw.experience.ComponentScriptContext} context The Component script context object.
 * @param {dw.util.Map} [modelIn] Additional model values created by another cartridge. This will not be passed in by Commcerce Cloud Plattform.
 *
 * @returns {string} The markup to be displayed
 */
module.exports.render = function (context, modelIn) {
    var model = modelIn || new HashMap();

    model.enabledPlugins = overlayHelper.enabledPlugins();

    return module.superModule.render(context, model);
};
