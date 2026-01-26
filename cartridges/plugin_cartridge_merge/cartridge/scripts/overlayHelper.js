'use strict';

/**
 * This script is a helper class for functions of the overlay cartridge
 */

var Site = require('dw/system/Site');
var preferencePrefix = 'sfraEnableOverlay';
var preferenceGroup = 'SFRA Unified Feature Cartridge';

/**
 * Determines if the passed plugin cartridge name is enabled by site preference
 * @param {string} pluginName - the plugin name to check if enabled
 * @returns {boolean} a boolean of true or false
 */
exports.isPluginEnabled = function (pluginName) {
    if (!pluginName) {
        return false;
    }
    var preferenceName = preferencePrefix + pluginName;
    var preferenceValue = Site.current.getCustomPreferenceValue(preferenceName);
    if (!preferenceValue) {
        return false;
    }
    return preferenceValue;
};
/**
 * Get enabled / disabled status of plugin cartridges from site preference group
 * @returns {Object} an an object of enabled plugins
 */
exports.enabledPlugins = function () {
    var collections = require('*/cartridge/scripts/util/collections');
    var sitePrefs = Site.getCurrent().getPreferences();
    var groups = sitePrefs.describe().attributeGroups;
    var sfraPreferences = {};
    collections.forEach(groups, function (group) {
        if (group.ID === preferenceGroup) {
            collections.forEach(group.attributeDefinitions, function (attribute) {
                var prefixIndex = attribute.ID.indexOf(preferencePrefix);
                if (prefixIndex > -1) {
                    sfraPreferences[attribute.ID.substr(preferencePrefix.length)] = Site.current.getCustomPreferenceValue(attribute.ID);
                }
            });
        }
    });

    return sfraPreferences;
};
/**
 * Appends plugin preference values to controller view data
 * @param {Object} res - the response from the controller to append values to
 */
exports.appendPluginPreferences = function (res) {
    var viewData = res.getViewData();
    viewData.enabledPlugins = this.enabledPlugins();
    res.setViewData(viewData);
};
