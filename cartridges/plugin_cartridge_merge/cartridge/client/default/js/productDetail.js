'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    // Include base details
    processInclude(require('./product/details'));

    // Gift Registry
    try {
        processInclude(require('giftregistry/product/giftRegistry'));
    } catch (ex) {
        // plugin not in use
    }

    // Apple pay
    try {
        processInclude(require('applepay/product/detail'));
    } catch (ex) {
        // plugin not in use
    }

    // Instore pickup
    try {
        processInclude(require('instorepickup/product/pdpInstoreInventory'));
    } catch (ex) {
        // plugin not in use
    }

    // Wishlists
    try {
        processInclude(require('wishlist/product/wishlist'));
    } catch (ex) {
        // plugin not in use
    }

    // Salesforce payments
    try {
        processInclude(require('commercepayments/product/payments'));
    } catch (ex) {
        // plugin not in use
    }
});
