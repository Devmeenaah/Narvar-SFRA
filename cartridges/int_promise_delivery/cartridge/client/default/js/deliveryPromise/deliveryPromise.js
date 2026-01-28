'use strict';

/**
 * Initialize delivery promise widget on PDP
 */
function initPDPWidget() {
    var $widget = $('.js-delivery-promise-widget');
    
    if (!$widget.length) {
        return;
    }
    
    var $zipInput = $widget.find('.js-delivery-zip-input');
    var $checkButton = $widget.find('.js-delivery-zip-check');
    var $result = $widget.find('.js-delivery-result');
    var $error = $widget.find('.js-delivery-error');

    /**
    * Show error message
    * @param {string} message - message
    */
    function showError(message) {
        $error.text(message).show();
        $result.hide();
    }

    /**
     * Calculate delivery date for ZIP
     * @param {string} zip - message
     */
    function calculateDelivery(zip) {
        if (!zip || zip.length !== 5) {
            showError('Please enter a valid 5-digit ZIP code');
            return;
        }
        
        $result.hide();
        $error.hide();
        $checkButton.prop('disabled', true).text('Calculating...');
        
        $.ajax({
            url: $widget.data('calculate-url'),
            method: 'GET',
            data: { zip: zip },
            success: function(response) {
                if (response.success) {
                    $result.find('.js-delivery-date').text(response.formattedDate);
                    $result.show();
                    $error.hide();
                } else {
                    showError(response.error || 'Unable to calculate delivery date');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
            },
            complete: function() {
                $checkButton.prop('disabled', false).text('Check');
            }
        });
    }
    
    // Load stored ZIP from session
    $.ajax({
        url: $widget.data('get-zip-url'),
        method: 'GET',
        success: function(response) {
            if (response.success && response.zip) {
                $zipInput.val(response.zip);
                calculateDelivery(response.zip);
            }
        }
    });
    
    // Calculate on button click
    $checkButton.on('click', function(e) {
        e.preventDefault();
        var zip = $zipInput.val().trim();
        calculateDelivery(zip);
    });
    
    // Calculate on Enter key
    $zipInput.on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            var zip = $zipInput.val().trim();
            calculateDelivery(zip);
        }
    });
    
    // Calculate on keydown or input change
    $zipInput.on('keydown input change', function() {
        var zip = $zipInput.val().trim();
        // Only calculate if a valid 5-digit ZIP is entered
        if (zip.length === 5) {
            calculateDelivery(zip);
        } else if (zip.length === 0) {
            // Clear results if input is empty
            $result.hide();
            $error.hide();
        }
    }); 
   
}

/**
 * Initialize delivery promise on checkout shipping methods
 */
function initCheckoutWidget() {
    var $shippingMethods = $('.shipping-method-list');

    if (!$shippingMethods.length) {
        return;
    }


    /**
     * Update delivery dates for all shipping methods
     */
    function updateShippingMethodDates() {
        var $methodList = $('.shipping-method-list').first();
        
        if (!$methodList.length) {
            return;
        }
        
        var calculateUrl = $methodList.data('calculate-url');
        
        if (!calculateUrl) {
            return;
        }

        $.ajax({
            url: calculateUrl,
            method: 'POST',
            success: function (response) {
                if (response.success) {
                    // Update each shipping method with delivery date
                        $('.shipping-method-list').each(function () {
                        var $methodItem = $(this);
                        // Clear estimated arrival time
                        $methodItem.find('.arrival-time').text('').hide();
                        // Update delivery date
                        $methodItem.find('.js-delivery-date-display')
                            .text('Get it by ' + response.formattedDate)
                            .show();  
                        });
                }
            }
        });
    }

    // Trigger calculation when checkout view is updated with new shipping methods
    $('body').on('checkout:updateCheckoutView', function () {
        updateShippingMethodDates();
    });
    
    // Also trigger on initial page load if shipping methods are present
    if ($shippingMethods.length) {
        setTimeout(function() {
            updateShippingMethodDates();
        }, 500);
    }
}

module.exports = {
    initPDPWidget: initPDPWidget,
    initCheckoutWidget: initCheckoutWidget
};
