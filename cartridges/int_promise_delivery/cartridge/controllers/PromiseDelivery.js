'use strict'

var server = require('server'); 
var deliveryDateHelper = require('*/cartridge/scripts/helpers/deliveryDateHelper.js');

/**
 * Calculate delivery date for a ZIP code
 * @route GET /PromiseDelivery-Calculate
 */
server.get('Calculate', function (req, res, next) {
    var zip = req.querystring.zip;
    
    if (!zip) {
        res.json({
            success: false,
            error: 'ZIP code is required'
        });
        return next();
    }
    
    var result = deliveryDateHelper.calculateDeliveryDate(zip);
    
    // Store ZIP in session for PDP persistence
    if (result.success) {
        session.privacy.deliveryPromiseZip = zip;
    }
    
    res.json(result);
    next();
});

/**
 * Get stored ZIP from session
 * @route GET /PromiseDelivery-GetStoredZip
 */
server.get('GetStoredZip', function (req, res, next) {
    var storedZip = session.privacy.deliveryPromiseZip || '';

    res.json({
        success: !!storedZip,
        zip: storedZip
    });
    
    next();
});

/**
 * Calculate delivery dates for all shipping methods at checkout
 * @route POST /PromiseDelivery-CalculateForShipping
 */
server.post('CalculateForShipping', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    
    if (!basket) {
        res.json({
            success: false,
            error: 'No basket found'
        });
        return next();
    }
    
    var shippingAddress = basket.defaultShipment.shippingAddress;
    
    if (!shippingAddress || !shippingAddress.postalCode) {
        res.json({
            success: false,
            error: 'No shipping address found'
        });
        return next();
    }
    
    var zip = shippingAddress.postalCode.substring(0, 5);
    var result = deliveryDateHelper.calculateDeliveryDate(zip);
    
    res.json(result);
    next();
});


module.exports = server.exports()
