'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    // Apple pay
    if (window.dw
        && window.dw.applepay
        && window.ApplePaySession
        && window.ApplePaySession.canMakePayments()) {
        $('body').addClass('apple-pay-enabled');
    }

    if ($('#checkout-main').hasClass('commercepayments')) {
        // Salesforce Payments
        try {
            processInclude(require('commercepayments/checkout/checkout'));
            processInclude(require('commercepayments/checkout/payments'));
        } catch (ex) {
            // plugin not in use
        }
    } else {
        // Instore pickup
        try {
            processInclude(require('instorepickup/checkout/checkout'));
            processInclude(require('instorepickup/checkout/instore'));
        } catch (ex) {
            // plugin not in use
        }
    }
});
