'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('PlaceOrder', function (req, res, next) {
    var Transaction = require('dw/system/Transaction');

    var viewData = res.getViewData();
    if (!viewData.error && viewData.orderID) {
        var OrderMgr = require('dw/order/OrderMgr');

        var order = OrderMgr.getOrder(viewData.orderID);
        //update order custom attribute 
        Transaction.wrap(function () {
            order.custom.customerSelectedDeliveryDate =  session.privacy.customerSelectedDeliveryDate; 
            session.privacy.customerSelectedDeliveryDate = '';
    });
    }

    next();
});

module.exports = server.exports();
