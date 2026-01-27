'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('PlaceOrder', function (req, res, next) {
    var viewData = res.getViewData();

    if (!viewData.error && viewData.orderID) {
        var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
        var collections = require('*/cartridge/scripts/util/collections');
        var OrderMgr = require('dw/order/OrderMgr');

        var order = OrderMgr.getOrder(viewData.orderID);
        //update order custom attribute 
        order.custom.customerSelectedDeliveryDate =  session.privacy.customerSelectedDeliveryDate; 
        
    }

    next();
});

module.exports = server.exports();
