'use strict';

var server = require('server');
server.extend(module.superModule);
var overlayHelper = require('~/cartridge/scripts/overlayHelper');

if (overlayHelper.isPluginEnabled('WishList')) {
    server.append('GetProduct', function (req, res, next) {
        overlayHelper.appendPluginPreferences(res);
        next();
    });
}
module.exports = server.exports();
