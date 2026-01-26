'use strict'; 

var Site = require('dw/system/Site');
var Calendar = require('dw/util/Calendar');
var Locale = require('dw/util/Locale');

/**
 * Check if current time is before cutoff time
 * @returns {boolean} True if before cutoff
 */
function isBeforeCutoff() {
    var cutoffTime = Site.current.getCustomPreferenceValue('deliveryPromiseCutoffTime') || '14:00';
    var cutoffParts = cutoffTime.split(':');
    var cutoff = { hour: parseInt(cutoffParts[0], 10), minute: parseInt(cutoffParts[1], 10) };
    
    // Get current time in EST (site timezone should be configured to EST)
    var now = new Calendar();
    var current = {hour: now.get(Calendar.HOUR_OF_DAY),  minute: now.get(Calendar.MINUTE) };
    
    if (current.hour < cutoff.hour) {
        return true;
    }
    if (current.hour === cutoff.hour && current.minute < cutoff.minute) {
        return true;
    }
    
    return false;
}


/**
 * Get ship date based on current time and cutoff
 * @returns {Date} Ship date
 */
function getShipDate() {
    var businessDayHelper = require('*/cartridge/scripts/helpers/businessDayHelper.js');

    var now = new Calendar();
    var shipDate = now.getTime();
    
    // If after cutoff, move to next day
    if (!isBeforeCutoff()) {
        now.add(Calendar.DAY_OF_MONTH, 1);
        shipDate = now.getTime();
    }
    
    // If ship date is not a business day, move to next business day
    while (!businessDayHelper.isBusinessDay(shipDate)) {
        now.add(Calendar.DAY_OF_MONTH, 1);
        shipDate = now.getTime();
    }
    
    return shipDate;
} 


/**
 * Format delivery date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date (e.g., "January 15th")
 */
function formatDeliveryDate(date) {
    var cal = new Calendar(date);
    var monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    var monthIndex = cal.get(Calendar.MONTH);
    var month = monthNames[monthIndex];
    var day = cal.get(Calendar.DAY_OF_MONTH);
    
    // Add ordinal suffix (st, nd, rd, th)
    var suffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
        suffix = 'st';
    } else if (day === 2 || day === 22) {
        suffix = 'nd';
    } else if (day === 3 || day === 23) {
        suffix = 'rd';
    }
    
    return month + ' ' + day + suffix;
}

/**
 * Calculate delivery promise date
 * @param {string} destinationZip - Destination ZIP code
 * @returns {Object} Result object with date and formatted string
 */
function calculateDeliveryDate(destinationZip) { 
    var transitTimeHelper = require('*/cartridge/scripts/helpers/transitTimeHelper.js');
    var businessDayHelper = require('*/cartridge/scripts/helpers/businessDayHelper.js');

    // check delivery date feature is enabled 
    if(!Site.current.getCustomPreferenceValue('deliveryPromiseEnabled')) { 
        return { 
            success: false, 
            error: 'Delivery promise feature is disabled.'
        };
    }

    // Validate Zip Code 
    if(!transitTimeHelper.isValidZipCode(destinationZip)) {
        return { 
            success: false, 
            error: 'Unable to calcualte delivery date for this ZIP code' + destinationZip
        };
    }

    // Get transit days 
    var transitDays = transitTimeHelper.getTransitDays(destinationZip);
    if(transitDays === null || transitDays === 0) { 
        return { 
            success: false, 
            error: 'Unable to calcualte transit date for this ZIP code'  + destinationZip
        };
    }

    // calculate ship date 
    var shipDate = getShipDate(); 

    // Add transit date, 
    var deliveryDate = businessDayHelper.addBusinessDays(shipDate, transitDays);

    // formate delivery date 
    var formattedDate = formatDeliveryDate(deliveryDate);

    return { 
        success: true,
        deliveryDate: deliveryDate,
        formattedDate: formattedDate, 
        transitDays: transitDays,
        shipDate: shipDate
    }

}


module.exports = {
    calculateDeliveryDate: calculateDeliveryDate,
    getShipDate: getShipDate,
    isBeforeCutoff: isBeforeCutoff,
    formatDeliveryDate: formatDeliveryDate
};