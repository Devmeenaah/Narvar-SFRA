'use strict';

var base = require('base/product/base');
var detail = require('base/product/detail');
var detailUpdateAddToCartEnableDisableOtherElements = detail.methods.updateAddToCartEnableDisableOtherElements;

/**
 * Registering on change event on quantity selector. If store has been selected, exist function,
 * otherwise proceed to update attributes.
 */
function availability() {
    $(document).on('change', '.quantity-select', function (e) {
        e.preventDefault();

        var searchPID = $(this).closest('.product-detail').attr('data-pid');
        var selectorPrefix = '.product-detail[data-pid="' + searchPID + '"]';

        if ($(selectorPrefix + ' .selected-store-with-inventory').is(':visible')) {
            return;
        }

        var $productContainer = $(this).closest('.product-detail');
        if (!$productContainer.length) {
            $productContainer = $(this).closest('.modal-content').find('.product-quickview');
        }

        if ($('.bundle-items', $productContainer).length === 0) {
            base.attributeSelect(
                $(e.currentTarget).find('option:selected').data('url'),
                $productContainer
            );
        }
    });
}

/**
 * Enable/disable Buy Now buttons based on product availability
 * @param {boolean} enableOrDisable - true or false
 */
function updateAddToCartEnableDisableOtherElements(enableOrDisable) {
    detailUpdateAddToCartEnableDisableOtherElements.call(this, enableOrDisable);
    $('.salesforce-buynow-element').attr('disabled', enableOrDisable);
}

var exportDetails = $.extend({}, base, detail, { availability: availability });
exportDetails.methods.updateAddToCartEnableDisableOtherElements = updateAddToCartEnableDisableOtherElements;

module.exports = exportDetails;
