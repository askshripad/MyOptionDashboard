
var path = require('path');
var moment = require('moment');
var fs = require('fs-extra');

exports.niftyurl = "https://www.nseindia.com/live_market/dynaContent/live_watch/option_chain/optionKeys.jsp";
exports.moneyControlURL = 'https://www.moneycontrol.com/indian-indices/nifty-50-9.html';

exports.bankniftyurl = "https://www.nseindia.com/live_market/dynaContent/live_watch/option_chain/optionKeys.jsp?symbolCode=-9999&symbol=BANKNIFTY&symbol=BANKNIFTY&instrument=OPTIDX&date=-&segmentLink=17&segmentLink=17";
exports.moneyControlBankNiftyURL = "http://www.moneycontrol.com/indian-indices/bank-nifty-23.html";

exports.BASE_DATA_DIR = path.join(__dirname, '..', 'niftydata');
//exports.EXPIRY_DIR = path.join(__dirname, '..', 'niftydata');
//Breakouts
exports.breakoutData = { recotime: null, callltp: null, strikeprice: null, ROI: null, action: null };
exports.nifty50 = { open: null, high: null, low: null, close: null, prevClose: null };
exports.banknifty = { open: null, high: null, low: null, close: null, prevClose: null };
exports.marketoff = false;
exports.wviewfile = null;
exports.stopFetchingData = false;
exports.bnatimeinterval = 300000;
exports.backtest = false;
exports.niftySP = null;
exports.NiftyATM = 0;
exports.TakeBackup = false;

exports.convertLocalDatetoUTCDate = function (date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

exports.convertUTCDateToLocalDate = function (date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
}

exports.RestoreNiftyData = function () {
    var src = exports.BASE_DATA_DIR;

    var date = new Date();
    var month = date.getMonth() + 1;
    var strdate = date.getDate() + '-' + month + '-' + date.getFullYear();
    var strdest = 'niftydata ' + strdate
    var dest = path.join(__dirname, '..', strdest);
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
        console.log('Backup dir created ', dest);
    }
    fs.copy(src, dest)
        .then(() => {
            console.log('-------------- RestoreNiftyData success ---------------');
            exports.TakeBackup = true;

        })
        .catch(err => console.log(' RestoreNiftyData Error ' + err))
}

exports.IsMarketClosed = function () {

    marketoff = false;
    //return;
    var now = new Date();
    var istHrs = moment(now).utcOffset("+05:30").format('HH');
    var istmins = moment(now).utcOffset("+05:30").format('mm');

    if (istHrs < 9) {
        marketoff = true;
        console.log('Market Closed');
        return;
    }

    if (istHrs == 9 && istmins < 16) {
        marketoff = true;
        console.log('Market Closed');
        return;
    }

    if (istHrs == 15 && istmins > 30) {
        marketoff = true;
        console.log('Market Closed');
        return;
    }

    // if (istHrs > 16) {
    //     marketoff = true;
    //     console.log('Market Closed');
    //     return;
    // }

    marketoff = false;
}


exports.IsBackup = function () {

    var retval = false;
    //return;
    var now = new Date();
    var istHrs = moment(now).utcOffset("+05:30").format('HH');
    var istmins = moment(now).utcOffset("+05:30").format('mm');

    if (istHrs < 15) {

        console.log('No Backup');
        return retval;
    }

    if (istHrs == 15 && istmins > 10) {
        TakeBackup = true;
        console.log('Start Backup');
        return retval;
    }

    // if (istmins > 8) {
    //     retval = true;
    //     console.log('Start Backup');
    //     return retval;
    // }

    return retval;
}

exports.ConvertToLocalTime = function (country, offset) {

    // create Date object for current location
    d = new Date();

    // convert to msec
    // add local time zone offset 
    // get UTC time in msec
    utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different country
    // using supplied offset
    nd = new Date(utc + (3600000 * offset));

    // return time as a string
    console.log("The local time in " + country + " is " + nd.toLocaleString());
    return nd;

}

exports.IsNullorUndefined = function (obj) {
    if (obj == undefined || obj == null)
        return true;
    else
        return false;
}