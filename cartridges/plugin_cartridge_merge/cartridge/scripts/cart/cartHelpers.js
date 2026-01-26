'use strict';

var base = require('app_storefront_base/cartridge/scripts/cart/cartHelpers');

var StoreMgr = require('dw/catalog/StoreMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var UUIDUtils = require('dw/util/UUIDUtils');
var Resource = require('dw/web/Resource');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var arrayHelper = require('*/cartridge/scripts/util/array');
var collections = require('*/cartridge/scripts/util/collections');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var overlayHelper = require('~/cartridge/scripts/overlayHelper');

/**
 * Adds a line item for this product to the Cart
 *
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {dw.catalog.Product} product - the product to add
 * @param {number} quantity - Quantity to add
 * @param {string[]}  childProducts - the products' sub-products
 * @param {dw.catalog.ProductOptionModel} optionModel - the product's option model
 * @param {dw.order.Shipment} defaultShipment - the cart's default shipment method
 * @return {dw.order.ProductLineItem} - The added product line item
 */
function addLineItem(currentBasket, product, quantity, childProducts, optionModel, defaultShipment) {
    var hasProductListItems = collections.find(defaultShipment.productLineItems, function (productLineItem) {
        return productLineItem.productListItem;
    });

    var shipment = hasProductListItems ? currentBasket.createShipment(UUIDUtils.createUUID()) : defaultShipment;
    var productLineItem = currentBasket.createProductLineItem(product, optionModel, shipment);

    if (product.bundle && childProducts.length) {
        base.updateBundleProducts(productLineItem, childProducts);
    }

    productLineItem.setQuantityValue(quantity);

    return productLineItem;
}

/**
 * Find all line items that contain the product specified.  A product can appear in different line
 * items that have different option selections or in product bundles.
 *
 * @param {string} productId - Product ID to match
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @return {Object} properties includes,
 *                  matchingProducts - collection of matching products
 *                  uuid - string value for the last product line item
 * @return {dw.order.ProductLineItem[]} - Filtered list of product line items matching productId
 */
function getMatchingProducts(productId, productLineItems) {
    var matchingProducts = [];
    var uuid;

    collections.forEach(productLineItems, function (item) {
        if (item.productID === productId && !item.productListItem) {
            matchingProducts.push(item);
            uuid = item.UUID;
        }
    });

    return {
        matchingProducts: matchingProducts,
        uuid: uuid
    };
}

/**
 * Filter all the product line items matching productId and
 * has the same bundled items or options in the cart
 * @param {dw.catalog.Product} product - Product object
 * @param {string} productId - Product ID to match
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @return {dw.order.ProductLineItem[]} - Filtered all the product line item matching productId and
 *     has the same bundled items or options
 */
function getExistingProductLineItemsInCart(product, productId, productLineItems, childProducts, options) {
    var matchingProductsObj = getMatchingProducts(productId, productLineItems);
    var matchingProducts = matchingProductsObj.matchingProducts;
    var productLineItemsInCart = matchingProducts.filter(function (matchingProduct) {
        return product.bundle
            ? base.allBundleItemsSame(matchingProduct.bundledProductLineItems, childProducts)
            : base.hasSameOptions(matchingProduct.optionProductLineItems, options || []);
    });

    return productLineItemsInCart;
}

/**
 * Filter the product line item matching productId and
 * has the same bundled items or options in the cart
 * @param {dw.catalog.Product} product - Product object
 * @param {string} productId - Product ID to match
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @return {dw.order.ProductLineItem} - get the first product line item matching productId and
 *     has the same bundled items or options
 */
function getExistingProductLineItemInCart(product, productId, productLineItems, childProducts, options) {
    return getExistingProductLineItemsInCart(product, productId, productLineItems, childProducts, options)[0];
}

/**
 * Adds a product to the cart. If the product is already in the cart it increases the quantity of
 * that product.
 * @param {dw.order.Basket} currentBasket - Current users's basket
 * @param {string} productId - the productId of the product being added to the cart
 * @param {number} quantity - the number of products to the cart
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @param {string} storeId - store id
 * @param {Object} req - The local instance of the request object
 * @return {Object} returns an error object
 */
function addProductToCart(currentBasket, productId, quantity, childProducts, options, storeId, req) {
    var inStorePickupEnabled = overlayHelper.isPluginEnabled('InStorePickup');

    var availableToSell;
    var defaultShipment = currentBasket.defaultShipment;
    var perpetual;
    var product = ProductMgr.getProduct(productId);
    var productInCart;
    var productLineItems = currentBasket.productLineItems;
    var productQuantityInCart;
    var quantityToSet;
    var optionModel = productHelper.getCurrentOptionModel(product.optionModel, options);
    var result = {
        error: false,
        message: Resource.msg('text.alert.addedtobasket', 'product', null)
    };

    var totalQtyRequested = 0;
    var canBeAdded = false;

    if (product.bundle) {
        canBeAdded = base.checkBundledProductCanBeAdded(childProducts, productLineItems, quantity);
    } else {
        totalQtyRequested = quantity + base.getQtyAlreadyInCart(productId, productLineItems);
        perpetual = product.availabilityModel.inventoryRecord.perpetual;
        canBeAdded = (perpetual || totalQtyRequested <= product.availabilityModel.inventoryRecord.ATS.value);
    }

    if (!canBeAdded) {
        result.error = true;
        result.message = Resource.msgf(
            'error.alert.selected.quantity.cannot.be.added.for',
            'product',
            null,
            product.availabilityModel.inventoryRecord.ATS.value,
            product.name
        );
        return result;
    }

    if (inStorePickupEnabled) {
        // Get the existing product line item from the basket if the new product item
        // has the same bundled items or options and the same instore pickup store selection
        productInCart = getExistingProductLineItemInCartWithTheSameStore(product, productId, productLineItems, childProducts, options, storeId);
    } else {
        productInCart = getExistingProductLineItemInCart(product, productId, productLineItems, childProducts, options);
    }

    if (productInCart) {
        productQuantityInCart = productInCart.quantity.value;
        quantityToSet = quantity ? quantity + productQuantityInCart : productQuantityInCart + 1;
        availableToSell = productInCart.product.availabilityModel.inventoryRecord.ATS.value;

        if (availableToSell >= quantityToSet || perpetual) {
            productInCart.setQuantityValue(quantityToSet);
            result.uuid = productInCart.UUID;
        } else {
            result.error = true;
            result.message = availableToSell === productQuantityInCart
                ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
                : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null);
        }
    } else {
        var productLineItem;

        var shipment = defaultShipment;
        if (inStorePickupEnabled) {
            // Create a new instore pickup shipment as default shipment for product line item
            // if the shipment if not exist in the basket
            var inStoreShipment = createInStorePickupShipmentForLineItem(currentBasket, storeId, req);
            shipment = inStoreShipment || defaultShipment;

            if (shipment.shippingMethod && shipment.shippingMethod.custom.storePickupEnabled && !storeId) {
                shipment = currentBasket.createShipment(UUIDUtils.createUUID());
            }
        }

        productLineItem = addLineItem(
            currentBasket,
            product,
            quantity,
            childProducts,
            optionModel,
            shipment
        );

        if (inStorePickupEnabled) {
            // Once the new product line item is added, set the instore pickup fromStoreId for the item
            if (productLineItem.product.custom.availableForInStorePickup) {
                if (storeId) {
                    var instorePickupStoreHelper = require('*/cartridge/scripts/helpers/instorePickupStoreHelpers');
                    instorePickupStoreHelper.setStoreInProductLineItem(storeId, productLineItem);
                }
            }
        }

        result.uuid = productLineItem.UUID;
    }

    if (inStorePickupEnabled) {
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            COHelpers.ensureNoEmptyShipments(req);
        });
    }

    return result;
}

/**
 * Finds a product with a matching ID and matching productListItem ID
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *      productLineItems
 * @param {string} productListItemID - the id of the productListItem to be added to the cart
 * @param {string} productId - The id of the product
 *  @return {Object} returns the matching productLineItem
 */
function getExistingProductListItemInCart(productLineItems, productListItemID, productId) {
    var matchingProduct = collections.find(productLineItems, function (item) {
        return item.productID === productId && item.productListItem && item.productListItem.ID === productListItemID;
    });

    return matchingProduct;
}

/**
 * Add a product to the cart formed from the productListItem in the gift registry
 * @param {dw.order.Basket} currentBasket - Current users's basket
 * @param {string} productListItemID - the id of the productListItem to be added to the cart
 * @param {number} quantity - the number of products to the cart
 * @param {string} productListID - The id of the productList
 *  @return {Object} returns an error object
 */
function addProductListItemToCart(currentBasket, productListItemID, quantity, productListID) {
    var ProductListMgr = require('dw/customer/ProductListMgr');

    var productList = ProductListMgr.getProductList(productListID);
    var productListItem = productList.getItem(productListItemID);

    var availableToSell;
    var canBeAdded = false;
    var perpetual;
    var product = productListItem.product;
    var productID = productListItem.productID;
    var productListItemInCart;
    var productListItemQuantityInCart;
    var productLineItems = currentBasket.productLineItems;
    var quantityToSet;
    var result = {
        success: true,
        message: Resource.msg('text.alert.addedtobasket', 'product', null)
    };
    var totalQtyRequested = 0;

    totalQtyRequested = quantity + base.getQtyAlreadyInCart(productID, productLineItems);
    perpetual = product.availabilityModel.inventoryRecord.perpetual;
    canBeAdded = (perpetual || totalQtyRequested <= product.availabilityModel.inventoryRecord.ATS.value);

    if (!canBeAdded) {
        result.success = false;
        result.message = Resource.msgf(
            'error.alert.selected.quantity.cannot.be.added.for',
            'product',
            null,
            product.availabilityModel.inventoryRecord.ATS.value,
            product.name
        );

        return result;
    }

    productListItemInCart = getExistingProductListItemInCart(productLineItems, productListItemID, productID);

    if (productListItemInCart) {
        productListItemQuantityInCart = productListItemInCart.quantity.value;
        quantityToSet = quantity ? quantity + productListItemQuantityInCart : productListItemQuantityInCart + 1;
        availableToSell = productListItemInCart.product.availabilityModel.inventoryRecord.ATS.value;

        if (availableToSell >= quantityToSet || perpetual) {
            productListItemInCart.setQuantityValue(quantityToSet);
            result.uuid = productListItemInCart.UUID;
        } else {
            result.success = false;
            result.message = availableToSell === productListItemQuantityInCart
                ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
                : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null);
        }
    } else {
        var shipment = currentBasket.createShipment(UUIDUtils.createUUID());
        var productLineItem = currentBasket.createProductLineItem(productListItem, shipment);

        productLineItem.setQuantityValue(quantity);

        result.uuid = productLineItem.UUID;
    }

    return result;
}

/* IN STORE PICKUP */

/**
 * Determines whether a product's current instore pickup store setting are
 * the same as the previous selected
 *
 * @param {string} existingStoreId - store id currently associated with this product
 * @param {string} selectedStoreId - store id just selected
 * @return {boolean} - Whether a product's current store setting is the same as
 * the previous selected
 */
function hasSameStore(existingStoreId, selectedStoreId) {
    return existingStoreId === selectedStoreId;
}

/**
 * Loops through all Shipments and attempts to select a ShippingMethod, where absent
 * @param {dw.catalog.Product} product - Product object
 * @param {string} productId - Product ID to match
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @param {string} storeId - store id
 * @return {dw.order.ProductLineItem} - Filtered the product line item matching productId
 *  and has the same bundled items or options and the same instore pickup store selection
 */
function getExistingProductLineItemInCartWithTheSameStore(
    product,
    productId,
    productLineItems,
    childProducts,
    options,
    storeId
) {
    var existingProductLineItem = null;
    var matchingProducts = getExistingProductLineItemsInCart(
        product,
        productId,
        productLineItems,
        childProducts,
        options
    );
    if (matchingProducts.length) {
        existingProductLineItem = arrayHelper.find(matchingProducts, function (matchingProduct) {
            return hasSameStore(matchingProduct.custom.fromStoreId, storeId);
        });
    }
    return existingProductLineItem;
}

/**
 * Get the existing in store pickup shipment in cart by storeId
 * @param {dw.order.Basket} basket - the target Basket object
 * @param {string} storeId - store id
 * @return {dw.order.Shipment} returns Shipment object if the existing shipment has the same storeId
 */
function getInStorePickupShipmentInCartByStoreId(basket, storeId) {
    var existingShipment = null;
    if (basket && storeId) {
        var shipments = basket.getShipments();
        if (shipments.length) {
            existingShipment = arrayHelper.find(shipments, function (shipment) {
                return hasSameStore(shipment.custom.fromStoreId, storeId);
            });
        }
    }
    return existingShipment;
}

/**
 * create a new instore pick shipment if the store shipment
 * is not exist in the basket for adding product line item
 * @param {dw.order.Basket} basket - the target Basket object
 * @param {string} storeId - store id
 * @param {Object} req - The local instance of the request object
 * @return {dw.order.Shipment} returns Shipment object
 */
function createInStorePickupShipmentForLineItem(basket, storeId, req) {
    var shipment = null;
    if (basket && storeId) {
        // check if the instore pickup shipment is already exist.
        shipment = getInStorePickupShipmentInCartByStoreId(basket, storeId);
        if (!shipment) {
            // create a new shipment to put this product line item in
            shipment = basket.createShipment(UUIDUtils.createUUID());
            shipment.custom.fromStoreId = storeId;
            shipment.custom.shipmentType = 'instore';
            req.session.privacyCache.set(shipment.UUID, 'valid');

            // Find in-store method in shipping methods.
            var shippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods();
            var shippingMethod = collections.find(shippingMethods, function (method) {
                return method.custom.storePickupEnabled;
            });
            var store = StoreMgr.getStore(storeId);
            var storeAddress = {
                address: {
                    firstName: store.name,
                    lastName: '',
                    address1: store.address1,
                    address2: store.address2,
                    city: store.city,
                    stateCode: store.stateCode,
                    postalCode: store.postalCode,
                    countryCode: store.countryCode.value,
                    phone: store.phone
                },
                shippingMethod: shippingMethod.ID
            };
            COHelpers.copyShippingAddressToShipment(storeAddress, shipment);
        }
    }
    return shipment;
}

module.exports = {
    addLineItem: addLineItem,
    addProductToCart: addProductToCart,
    checkBundledProductCanBeAdded: base.checkBundledProductCanBeAdded,
    ensureAllShipmentsHaveMethods: base.ensureAllShipmentsHaveMethods,
    getQtyAlreadyInCart: base.getQtyAlreadyInCart,
    getNewBonusDiscountLineItem: base.getNewBonusDiscountLineItem,
    getExistingProductLineItemInCart: getExistingProductLineItemInCart,
    getExistingProductLineItemsInCart: getExistingProductLineItemsInCart,
    getMatchingProducts: getMatchingProducts,
    allBundleItemsSame: base.allBundleItemsSame,
    hasSameOptions: base.hasSameOptions,
    addProductListItemToCart: addProductListItemToCart,
    BONUS_PRODUCTS_PAGE_SIZE: base.BONUS_PRODUCTS_PAGE_SIZE,
    getReportingUrlAddToCart: base.getReportingUrlAddToCart,
    checkPliCanBeUpdated: base.checkPliCanBeUpdated
};
