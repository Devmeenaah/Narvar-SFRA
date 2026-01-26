'use strict';

var Site = require('dw/system/Site');
var Calendar = require('dw/util/Calendar');

/**
 * Get list of holiday dates from site preferences
 * @returns {Set<Date>} Set of holiday date objects
 */
function buildHolidaySet() {
    var holidayString = Site.current.getCustomPreferenceValue('deliveryPromiseHolidays');

    if (!holidayString) return {};

    var set = {};

    holidayString.split(',').forEach(function (d) {
        set[d.trim()] = true;
    });

    return set;
}
/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if holiday
 */
function formatDateYMD(date) {
    var cal = new Calendar(date);
    var m = cal.get(Calendar.MONTH) + 1;
    var d = cal.get(Calendar.DAY_OF_MONTH);

    return cal.get(Calendar.YEAR) + '-' +
        (m < 10 ? '0' : '') + m + '-' +
        (d < 10 ? '0' : '') + d;
}

/**
 * Get list of holiday dates from custom site preferences
 *  @param {Date} date - Date to check
 * @returns {boolean} if given date is a holiday
 */
function isHoliday(date) {
    var holidaySetCache;
    if (!holidaySetCache) {
        holidaySetCache = buildHolidaySet(
            Site.current.getCustomPreferenceValue('deliveryPromiseHolidays')
        );
    }

    return !!holidaySetCache[formatDateYMD(date)];
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
function isWeekend(date) {
    var cal = new Calendar(date);
    var dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
    return dayOfWeek === Calendar.SATURDAY || dayOfWeek === Calendar.SUNDAY;
}

/**
 * Check if a date is a business day
 * @param {Date} date - Date to check
 * @returns {boolean} True if business day
 */
function isBusinessDay(date) {
    return !isWeekend(date) && !isHoliday(date);
}



/**
 * Add business days to a date
 * @param {Date} startDate - Starting date
 * @param {number} businessDays - Number of business days to add
 * @returns {Date} Resulting date
 */
function addBusinessDays(startDate, businessDays) {
    var cal = new Calendar(startDate);
    var daysAdded = 0;
    
    while (daysAdded < businessDays) {
        cal.add(Calendar.DAY_OF_MONTH, 1);
        var currentDate = cal.getTime();
        
        if (isBusinessDay(currentDate)) {
            daysAdded++;
        }
    }
    
    return cal.getTime();
}

module.exports = {
    buildHolidaySet: buildHolidaySet, 
    isWeekend: isWeekend,
    isHoliday: isHoliday,
    isBusinessDay: isBusinessDay,
    addBusinessDays: addBusinessDays,
    formatDateYMD: formatDateYMD
};