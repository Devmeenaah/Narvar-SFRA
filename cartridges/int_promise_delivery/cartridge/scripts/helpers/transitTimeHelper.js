'use strict';

/**
 * Transit time lookup based on ZIP code ranges. 
 * Data should be derived from Site preference -- make this change
 */

var Site = require('dw/system/Site');


/**
 * Mock transit time data
 * Maps destination ZIP ranges to business days
 */
var TRANSIT_MAP =  [
    { zipStart: 0, zipEnd: 19999, days: 1 },
    { zipStart: 20000, zipEnd: 39999, days: 2 },
    { zipStart: 40000, zipEnd: 59999, days: 3 },
    { zipStart: 60000, zipEnd: 79999, days: 4 },
    { zipStart: 80000, zipEnd: 99999, days: 5 }
];



/**
 * Get transit days for a destination ZIP code
 * @param {string} destinationZip - 5-digit US ZIP code
 * @returns {number} Transit days (business days)
 */
function getTransitDays(destinationZip) {
    if (!destinationZip || destinationZip.length !== 5) {
        return null;
    }

    var zipNum = parseInt(destinationZip, 10);
    
    if (isNaN(zipNum)) {
        return null;
    }

    for (var i = 0; i < TRANSIT_MAP.length; i++) {
        var range = TRANSIT_MAP[i];
        if (zipNum >= range.zipStart && zipNum <= range.zipEnd) {
            return range.days;
        }
    }

    return 0;
}



/**
 * Validate US ZIP code format
 * @param {string} zipCode - ZIP code to validate
 * @returns {boolean} True if valid 5-digit ZIP
 */
function isValidZipCode(zipCode) {
    return /^\d{5}$/.test(zipCode);
}

module.exports = {
    getTransitDays: getTransitDays,
    isValidZipCode: isValidZipCode
};