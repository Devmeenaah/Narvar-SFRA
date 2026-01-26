'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    // Base
    processInclude(require('base/search'));

    // Wishlist
    try {
        processInclude(require('wishlist/product/wishlistHeart'));
    } catch (ex) {
        // plugin not in use
    }

    // Product Compare
    try {
        processInclude(require('productcompare/product/compare'));
    } catch (ex) {
        // plugin not in use
    }
});
