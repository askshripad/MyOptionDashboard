var express = require('express');
var router = express.Router();

var osmosis = require('osmosis');
var fs = require('fs');
var jsonfile = require('jsonfile');
var path = require('path'),
  bodyParser = require('body-parser');

var _ = require('lodash');
var moment = require('moment');

var globalvar = require('../common/globalvar');

var dt = new Date();
var fetchBankNifty = false;

var niftydata = 'niftydata';
var datarange = 400;

//var BASE_DATA_DIR = path.join(__dirname, '..', '..', niftydata);
var latestspdata = [];
var niftyspdata = [];
// var niftysp1data = { sp: 0, data: [] };
// var niftysp2data = { sp: 0, data: [] };
// var niftysp3data = { sp: 0, data: [] };

// var niftysp4data = { sp: 0, data: [] };
// var niftysp5data = { sp: 0, data: [] };
// var niftysp6data = { sp: 0, data: [] };
// var niftysp7data = { sp: 0, data: [] };

var niftyopen = 0;
//var nifty50 = { open: null, high: null, low: null, close: null };

router.get('/test', function (req, res) {
  res.json({
    results: "test"
  });
});

IsNullorUndefined = function (obj) {
  if (obj == undefined || obj == null)
    return true;
  else
    return false;
}

function parseoptiondata(item, sp) {
  var retval = false;
  return new Promise((resolve, reject) => {
    var precision = 2;
    item.calloi = item.calloi.split(',').join('');
    item.callcoi = item.callcoi.split(',').join('');
    item.putoi = item.putoi.split(',').join('');
    item.putcoi = item.putcoi.split(',').join('');

    item.callvolume = item.callvolume.split(',').join('');
    item.putvolume = item.putvolume.split(',').join('');

    item.calloi = parseFloat(item.calloi);
    item.callcoi = parseFloat(item.callcoi);
    item.putoi = parseFloat(item.putoi);
    item.putcoi = parseFloat(item.putcoi);

    item.callvolume = parseFloat(item.callvolume);
    item.putvolume = parseFloat(item.putvolume);

    item.sp = Number(item.sp);
    item.lastdata = null;
    latestspdata.push(item);
    for (let index = 0; index < niftyspdata.length; index++) {
      var element = niftyspdata[index];
      if (element.sp == item.sp) {
        element.data.push(item);
        console.log('ADDING Nifty SP  data for ', element.sp);
        retval = true;
        resolve(retval);
        break;
      }

      if (index == (niftyspdata.length - 1)) {
        reject(retval);
      }

    }
  });



}

function fetchNSEData(res) {
  latestspdata = [];
  var retval = false;
  var parsedata = [];
  var niftytime = "";;
  var currentNifty = 0;
  osmosis
    .get(globalvar.niftyurl)
    .find('//*[@id="octable"]//tr')
    .find('//*[@id="wrapper_btm"]//tr')
    .set({
      currnifty: 'td[2]/div/span[1]/b',
      sp: 'td[12]',
      calloi: 'td[2]',
      callcoi: 'td[3]',
      callvolume: 'td[4]',
      calliv: 'td[5]',
      callltp: 'td[6]',
      putltp: 'td[18]',
      putiv: 'td[19]',
      putvolume: 'td[20]',
      putcoi: 'td[21]',
      putoi: 'td[22]'

    })
    .data(item => {
      //console.log('latest nifty', item.currnifty);
      if (!retval && item.currnifty != null && item.currnifty != undefined) {
        currentNifty = item.currnifty;
        retval = true;
      }
      var dt = new Date();
      var newtime = moment(dt).utcOffset("+05:30").format();//moment.utc().format('DD-MM-YYYY HH:mm:ss');
      //var currtime = ist;
      item.date = moment(dt).utcOffset("+05:30").format("DD-MM-YYYY");
      item.time = moment(dt).utcOffset("+05:30").format("HH:mm");
      niftytime = item.time;
      var sp = Number(item.sp);
      var lowerspRange = niftyopen - 400;
      var higherspRange = niftyopen + 400;
      //console.log('Todays SP range ' + lowerspRange + higherspRange);
      if (!IsNullorUndefined(sp) && sp >= lowerspRange && sp <= higherspRange && !parsedata.includes(sp)) {
        parsedata.push(sp);
        parseoptiondata(item, sp);
      }

    })
    .done(function () {
      if (globalvar.IsNullorUndefined(currentNifty) || currentNifty == 0) {
        console.log('Error while data scrapping ##### ', currentNifty);
        return;
      }
      var val = currentNifty.split(' ');
      //console.log(val);
      if (val.length == 2) {
        globalvar.nifty50.close = parseFloat(val[1]);
        niftyspdata[0].data.push({ close: globalvar.nifty50.close, time: niftytime });
      }
      else
        currentNifty = 0;
      console.log('data scrapping done!! ', currentNifty);
      setTimeout(ProcessData, 5000);
      //ProcessData();
    });
  //createOptionDataOutPutFile(output);

}

CreateDataInJsonFormat = function (myspdata) {

  var now = new Date();
  var istHrs = moment(now).utcOffset("+05:30").format('HH');
  var istmins = moment(now).utcOffset("+05:30").format('mm');
  var time = istHrs + ':' + istmins;
  console.log('Inside CreateDataInJsonFormat ', time);

  var currdata = myspdata.data[myspdata.data.length - 1];
  var filename = "sp" + myspdata.sp.toString() + ".json";
  filetowrite = path.join(globalvar.BASE_DATA_DIR, filename);
  AppendDataToJsonFile(currdata, filetowrite);
}

ProcessData = function () {
  console.log('Inside ProcessData ');
  for (let index = 0; index < niftyspdata.length; index++) {
    var element = niftyspdata[index];
    console.log('Create Data in Json format ', element.sp);
    if (element.data.length > 0)
      CreateDataInJsonFormat(element);
  }

}

IsNullorUndefined = function (obj) {
  if (obj == undefined || obj == null)
    return true;
  else
    return false;
}


function AppendDataToJsonFile(obj, filename) {

  jsonfile.writeFile(filename, obj, { flag: 'a' }, function (err) {
    if (err)
      console.error(err)
  })
}

function getnowSP() {
  return new Promise((resolve, reject) => {
    osmosis.get(globalvar.moneyControlURL)
      .find('//*[@id="mc_mainWrapper"]')
      .set({
        nifty: 'div[3]/div[1]/div[4]/div[1]/strong',
        open: '//div[@id="mc_mainWrapper"]//tr[2]/td[1][@class="bggry02 br01"]:html',
        high: '//div[@id="mc_mainWrapper"]//tr[2]/td[2]:html',
        low: '//div[@id="mc_mainWrapper"]//tr[3]/td[2]:html',
        prevclose: '//div[@id="mc_mainWrapper"]//tr[3]/td[1]:html',
        dateTime: 'div[3]/div[1]/p[1]'
      })
      .data
      (item => {
        //console.log('II ', item);
        var arrNiftyDT = [];
        if (item.open != null || item.open != undefined) {
          var n = item.open.indexOf("</span>");
          var open = item.open.substring(n + 7);
          open = open.trim();
          open = open.split(',').join('');
          console.log('open ', open);
          arrNiftyDT.push(open);
          globalvar.nifty50.open = open;
        }

        if (item.prevclose != null || item.prevclose != undefined) {
          var n = item.prevclose.indexOf("</span>");
          var prevclose = item.prevclose.substring(n + 7);
          prevclose = prevclose.trim();
          prevclose = prevclose.split(',').join('');
          console.log('prevclose ', prevclose);
          globalvar.nifty50.prevclose = parseFloat(prevclose);
        }
        if (item.high != null || item.high != undefined) {
          var n = item.high.indexOf("</span>");
          var high = item.high.substring(n + 7);
          high = high.trim();
          high = high.split(',').join('');
          console.log('high ', high);
          arrNiftyDT.push(high);
          globalvar.nifty50.high = high;
        }
        if (item.low != null || item.low != undefined) {
          var n = item.low.indexOf("</span>");
          var low = item.low.substring(n + 7);
          low = low.trim();
          low = low.split(',').join('');
          console.log('low ', low);
          arrNiftyDT.push(low);
          globalvar.nifty50.low = low;
        }
        if (item.nifty != null || item.nifty != undefined) {
          item.nifty = item.nifty.trim();
          item.nifty = item.nifty.split(',').join('');
          console.log('close ', item.nifty);
          arrNiftyDT.push(item.nifty);
          globalvar.nifty50.close = item.nifty;
        }

        arrNiftyDT.push(item.dateTime);

        if (!IsNullorUndefined(arrNiftyDT)) {
          resolve(arrNiftyDT); // fulfilled
        } else {
          var reason = new Error('item.nifty is null');
          reject(reason); // reject
        }
      })
  })
}

function getATM() {
  return new Promise((resolve, reject) => {
    getnowSP()
      .then
      (indexNifty => {
        //console.log("Nifty:"+indexNifty); //Current Strike price 
        getStrikePriceArr()
          .then(
            data => {
              //console.log('data ', data);
              var curr = data[0];
              var diff = Math.abs(indexNifty[0] - curr);
              //console.log('diff ', diff);
              for (var val = 0; val < data.length; val++) {
                var newdiff = Math.abs(indexNifty[0] - data[val]);
                if (newdiff < diff) {
                  diff = newdiff;
                  curr = data[val];
                }
              }
              if (!IsNullorUndefined(curr)) {
                var atmDT = [];
                atmDT.push(curr);
                atmDT.push(indexNifty[0]);
                resolve(atmDT); // fulfilled
              } else {
                var reason = new Error('curr is null');
                reject(reason); // reject
              }
            })
      })
  }
  );
}

function getCurrentATM() {
  return new Promise((resolve, reject) => {

    //
    var TodaysATMStrikePrice = 0;
    var close = globalvar.nifty50.close;
    var StrikePriceDiff = 50;
    var remainder = close % 100;
    //console.log('remainder ', remainder);
    if (remainder < 1) {
      TodaysATMStrikePrice = (close / 100) * 100;
      //console.log('TodaysATMStrikePrice ', TodaysATMStrikePrice);
      resolve(TodaysATMStrikePrice);
    }
    remainder = close % StrikePriceDiff;
    //console.log('remainder ', remainder);
    if (remainder < 1 || remainder < (StrikePriceDiff / 2)) {
      var diff = parseInt(close / StrikePriceDiff);
      TodaysATMStrikePrice = diff * StrikePriceDiff;
      //console.log('TodaysATMStrikePrice ', TodaysATMStrikePrice);
      resolve(TodaysATMStrikePrice);
    }
    else {
      var diff = parseInt(close / StrikePriceDiff);
      var tmp = diff * StrikePriceDiff;
      //console.log('tmp ', tmp);
      TodaysATMStrikePrice = tmp + StrikePriceDiff;
      //console.log('TodaysATMStrikePrice ', TodaysATMStrikePrice);
      resolve(TodaysATMStrikePrice);
    }
    resolve(TodaysATMStrikePrice);
    //
    var curr = globalvar.niftySP[0];
    var diff = Math.abs(globalvar.nifty50.close - curr);
    for (var val = 0; val < globalvar.niftySP.length; val++) {
      var newdiff = Math.abs(globalvar.nifty50.close - globalvar.niftySP[val]);
      if (newdiff < diff) {
        diff = newdiff;
        curr = globalvar.niftySP[val];
      }
    }
    if (!IsNullorUndefined(curr)) {
      var currentATM = curr;
      resolve(currentATM); // fulfilled
    } else {
      var reason = new Error('curr is null');
      reject(reason); // reject
    }
  })

}

function getStrikePriceArr() {
  return new Promise((resolve, reject) => {
    var niftySP = [];
    var upperlimit = Number(globalvar.nifty50.open) + 300;
    var lowerlimit = Number(globalvar.nifty50.open) - 300;
    //console.log('upper limit ', upperlimit);
    //console.log('lower limit ', lowerlimit);
    osmosis.get(globalvar.niftyurl)
      .find('//table[@id="octable"]//tr')
      .set({
        strikePrice: 'td[12]'
      })
      .data
      (item => {
        var sp = Number(item.strikePrice);

        if (!IsNullorUndefined(sp) && sp >= lowerlimit && sp <= upperlimit) {
          niftySP.push(item.strikePrice);
          //console.log('niftySP ', niftySP);
        }
      })
      .done(() => {
        globalvar.niftySP = niftySP;
        resolve(niftySP)
      });
  });
}



var interval = setInterval(function () {
  if (globalvar.backtest) {
    console.log('Return from setinterval as server is in backtest mode.... ');
    clearInterval(interval);
    return;
  }
  // Do something every 5 seconds

  if (globalvar.IsBackup() && exports.TakeBackup == false) {
    console.log('--------------- Restore Nifty data -----------');
    globalvar.RestoreNiftyData();
    exports.TakeBackup = true;
    //return;
  }

  console.log('Looking for new Nifty data [ALL SPS]....');
  if (globalvar.stopFetchingData) {
    globalvar.stopFetchingData = false;
    ClearData()
  }

  CheckForOptionData();
  var dataupdated = true;

}, 60000); //900000



function CheckForOptionData() {
  globalvar.marketoff = false;
  if (niftyopen == 0) {
    getATM()
      .then
      (indexNifty => {
        niftyopen = Math.round(Number(indexNifty[1]));
        console.log('Todays Nifty open and ATM ', niftyopen, indexNifty[0]);

        var atm1 = Number(indexNifty[0]);//niftyopen % 100;
        globalvar.NiftyATM = atm1;
        var firstsp = atm1;

        var spdiff = 50;
        var count = datarange / spdiff;
        var currsp = 0;

        var sptemp1 = { sp: 'nifty', data: [] }
        niftyspdata.push(sptemp1);

        for (let i = 1; i <= count; i++) {
          if (i == 1)
            currsp = firstsp;
          else
            currsp = currsp + spdiff;
          var sptemp = { sp: currsp, data: [] }
          niftyspdata.push(sptemp);

        }

        var cuursp1 = firstsp;
        for (let j = 1; j <= count; j++) {

          cuursp1 = cuursp1 - spdiff;
          var sptemp = { sp: cuursp1, data: [] }
          niftyspdata.push(sptemp);

        }

        for (let k = 0; k < niftyspdata.length; k++) {
          console.log('Today Nifty SPs  ', niftyspdata[k]);
        }

      });
  }

  if (niftyopen > 0) {
    fetchNSEData();
  }



}



function getLastXValuesofStrikePrices(sp, fetchitems) {
  console.log('incoming getLastXValuesofStrikePrices ', sp);
  return new Promise((resolve, reject) => {
    var spdata = [];

    //
    for (let index = 0; index < niftyspdata.length; index++) {
      var element = niftyspdata[index];
      if (element.sp == sp) {
        console.log('Fetching last X values for ', element.sp);
        if (fetchitems == 1)
          spdata.push(element.data[element.data.length - 1]);
        else {
          if (element.data.length > fetchitems) {
            spdata = element.data;//.slice(-fetchitems);
          }
          else
            spdata = element.data;
        }
        resolve(spdata);
        break;
      }
    }
    //   
    //console.log('SP data ', spdata);
  })
}


function FindElement(element, time) {
  return element.time == time;
}

function CalculateTotalCOIForSelectedSPs(splist, fetchitems) {
  console.log('incoming CalculateTotalCOIForSelectedSPs ', splist);
  return new Promise((resolve, reject) => {
    var sumdata = [];
    var spindexlist = [];

    //Get interested SPS Array index
    for (let index = 0; index < niftyspdata.length; index++) {
      var element = niftyspdata[index];
      if (splist.includes(element.sp)) {
        spindexlist.push(index);
      }

    }

    // calculate total coi
    for (let index = 0; index < spindexlist.length; index++) {
      //var totalcallcoi = 0;
      //var totalputcoi = 0;
      var time = "0";
      var pos = spindexlist[index];
      var element = niftyspdata[pos];
      if (fetchitems == 1) {
        var lastelm = element.data[element.data.length - 1];
        console.log('****** last elm callcoi ***** ', lastelm.callcoi, element.sp);
        time = lastelm.time;
        var found = _.find(sumdata, { time: time });
        if (globalvar.IsNullorUndefined(found)) {
          //totalcallcoi = totalcallcoi + lastelm.callcoi;
          //totalputcoi = totalputcoi + lastelm.putcoi;
          sumdata.push({ time: time, callcoi: lastelm.callcoi, putcoi: lastelm.putcoi });
        }
        else {
          console.log('inside else --->>> updating existing object - Fetchitem = 1');
          found.callcoi += lastelm.callcoi;
          found.putcoi += lastelm.putcoi;
        }
      }
      else {
        for (let k = 0; k < element.data.length; k++) {
          var temp = element.data[k];

          console.log('****** temp callcoi ***** ', temp.callcoi, element.sp);
          var time = temp.time;
          var found = _.find(sumdata, { time: time });
          if (globalvar.IsNullorUndefined(found)) {
            //totalcallcoi = totalcallcoi + temp.callcoi;
            //totalputcoi = totalputcoi + temp.putcoi;
            sumdata.push({ time: time, callcoi: temp.callcoi, putcoi: temp.putcoi });
          }
          else {
            console.log('inside else --->>> updating existing object');
            found.callcoi += temp.callcoi;
            found.putcoi += temp.putcoi;
          }



        }
      }



    }

    resolve(sumdata);
    //   
    //console.log('SP data ', spdata);
  })
}


router.post('/test1', function (req, res) {
  console.log('inside test');
  globalvar.RestoreNiftyData();
  res.send('success');
  // getCurrentATM().then
  //   (currentATM => {
  //     res.send({ currentATM: currentATM });
  //   })
})

var i = 1;
router.post('/data', function (req, res) {
  i++;
  var data1 = [];
  var data2 = [];
  var data3 = [];
  var newatm = false;
  var dt = new Date();
  var fetchitems = 1;
  var customsp = req.body.customsp;

  if (req.body.customsp == true) {
    console.log('inside nifty option data with custom SP..... ', req.body.customsp, req.body.fetchall);
    var sp1 = Number(req.body.sp1);
    var sp2 = Number(req.body.sp2);
    var sp3 = Number(req.body.sp3);
    var fetchall = req.body.fetchall;
    if (fetchall) {
      fetchitems = 100;
      newatm = true;
    }
    getLastXValuesofStrikePrices(sp1, fetchitems)
      .then(spdata1 => {
        console.log('1 ', spdata1.length);
        data1 = spdata1;
        getLastXValuesofStrikePrices(sp2, fetchitems)
          .then(spdata2 => {
            data2 = spdata2;
            console.log('2 ', spdata2.length);
            getLastXValuesofStrikePrices(sp3, fetchitems)
              .then(spdata3 => {
                data3 = spdata3;
                console.log('3 newatm fetchitems', spdata3.length, newatm, fetchitems);
                res.send({
                  data1: data1, data2: data2, data3: data3, newatm: newatm,
                  niftyclose: globalvar.nifty50.close, niftyprevclose: globalvar.nifty50.prevclose
                });
              })
          })
      });
  }
  else {
    console.log('inside nifty option data with standar flow..... ');
    getCurrentATM()
      .then
      (currentATM => {
        //i <= 10 || i > 20
        if (globalvar.NiftyATM == currentATM) {
          console.log('currentATM ******* ', globalvar.NiftyATM, i);
          newatm = false;
          fetchitems = 1;
        }
        else {
          console.log('NEW ATM --------- ', currentATM, i);
          newatm = true;
          fetchitems = 100;
          globalvar.NiftyATM = currentATM;
        }
        var otm = currentATM + 50;
        var itm = currentATM - 50;
        getLastXValuesofStrikePrices(globalvar.NiftyATM, fetchitems)
          .then(spdata1 => {
            console.log('1');
            data1 = spdata1;
            getLastXValuesofStrikePrices(itm, fetchitems)
              .then(spdata2 => {
                data2 = spdata2;
                console.log('2');
                getLastXValuesofStrikePrices(otm, fetchitems)
                  .then(spdata3 => {
                    data3 = spdata3;
                    console.log('3 newatm fetchitems', newatm, fetchitems);
                    res.send({
                      data1: data1, data2: data2, data3: data3, newatm: newatm,
                      niftyclose: globalvar.nifty50.close, niftyprevclose: globalvar.nifty50.prevclose
                    });
                  })
              })
          });



      })
  }


});


//
router.post('/data5', function (req, res) {
  i++;
  var data1 = [];
  var data2 = [];
  var data3 = [];
  var data4 = [];
  var data5 = [];
  var niftydata = [];
  var newatm = false;
  var dt = new Date();
  var fetchitems = 1;
  var customsp = req.body.customsp;

  var fetchall = req.body.fetchall;
  if (fetchall) {
    fetchitems = 100;
    newatm = true;
  }

  var customsp = req.body.customsp;

  if (req.body.customsp == true) {
    var sp1 = Number(req.body.sp1);
    var sp2 = Number(req.body.sp2);
    var sp3 = Number(req.body.sp3);
    var sp4 = Number(req.body.sp4);
    var sp5 = Number(req.body.sp5);

    console.log('inside nifty option data 5 with custom sp---- ', sp1, sp2, sp3, sp4, sp5);

    getLastXValuesofStrikePrices(sp1, fetchitems)
      .then(spdata1 => {
        console.log('1 ', spdata1.length);
        data1 = spdata1;
        getLastXValuesofStrikePrices(sp2, fetchitems)
          .then(spdata2 => {
            data2 = spdata2;
            console.log('2 ', spdata2.length);
            getLastXValuesofStrikePrices(sp3, fetchitems)
              .then(spdata3 => {
                data3 = spdata3;
                console.log('3 newatm fetchitems', spdata3.length, newatm, fetchitems);
                getLastXValuesofStrikePrices(sp4, fetchitems)
                  .then(spdata4 => {
                    data4 = spdata4;
                    console.log('4 newatm fetchitems', spdata4.length, newatm, fetchitems);
                    getLastXValuesofStrikePrices(sp5, fetchitems)
                      .then(spdata5 => {
                        data5 = spdata5;
                        console.log('5 newatm fetchitems', spdata5.length, newatm, fetchitems);
                        var splist = [];
                        splist.push(sp1);
                        splist.push(sp2);
                        splist.push(sp3);
                        console.log('INPUT SP LIST ', splist);
                        CalculateTotalCOIForSelectedSPs(splist, fetchitems)
                          .then(sumdata => {
                            res.send({
                              data1: data1, data2: data2, data3: data3, data4: data4, data5: data5,
                              newatm: newatm, niftydata: niftyspdata[0].data,
                              niftyclose: globalvar.nifty50.close,
                              niftyprevclose: globalvar.nifty50.prevclose, sumdata: sumdata
                            });
                          });
                      })

                  })

              })
          })
      });

  }
  else {

    console.log('inside nifty option data with standar flow..... ');
    getCurrentATM()
      .then
      (currentATM => {
        //i <= 10 || i > 20
        if (globalvar.NiftyATM == currentATM) {
          console.log('currentATM ******* ', globalvar.NiftyATM, i);
          newatm = false;
          fetchitems = 1;
          if (fetchall) {
            fetchitems = 100;
          }
        }
        else {
          console.log('NEW ATM --------- ', currentATM, i);
          newatm = true;
          fetchitems = 100;
          globalvar.NiftyATM = currentATM;
        }
        var otm1 = currentATM + 50;
        var otm2 = otm1 + 50;
        var itm1 = currentATM - 50;
        var itm2 = itm1 - 50;

        getLastXValuesofStrikePrices(globalvar.NiftyATM, fetchitems)
          .then(spdata1 => {
            console.log('1 ', spdata1.length);
            data1 = spdata1;
            getLastXValuesofStrikePrices(otm1, fetchitems)
              .then(spdata2 => {
                data2 = spdata2;
                console.log('2 ', spdata2.length);
                getLastXValuesofStrikePrices(otm2, fetchitems)
                  .then(spdata3 => {
                    data3 = spdata3;
                    console.log('3 newatm fetchitems', spdata3.length, newatm, fetchitems);
                    getLastXValuesofStrikePrices(itm1, fetchitems)
                      .then(spdata4 => {
                        data4 = spdata4;
                        console.log('4 newatm fetchitems', spdata4.length, newatm, fetchitems);
                        getLastXValuesofStrikePrices(itm2, fetchitems)
                          .then(spdata5 => {
                            data5 = spdata5;
                            console.log('5 newatm fetchitems', spdata5.length, newatm, fetchitems);
                            var splist = [];
                            splist.push(currentATM);
                            splist.push(otm1);
                            splist.push(otm2);
                            console.log('INPUT SP LIST ', splist);
                            var currniftydata = niftyspdata[0];
                            var niftydatares = [];
                            if (fetchitems <= 1) {

                              niftydatares.push(currniftydata.data[currniftydata.data.length - 1]);
                            }
                            else {
                              niftydatares = currniftydata.data;
                            }
                            CalculateTotalCOIForSelectedSPs(splist, fetchitems)
                              .then(sumdata => {
                                res.send({
                                  data1: data1, data2: data2, data3: data3, data4: data4, data5: data5,
                                  newatm: newatm, niftydata: niftydatares,
                                  niftyclose: globalvar.nifty50.close,
                                  niftyprevclose: globalvar.nifty50.prevclose,
                                  sumdata: sumdata
                                });

                              })

                          })

                      })

                  })
              })
          });
      })
  }

});
//

function parsePutOTMData() {
  console.log('parsePutOTMData ', niftyPutsp1data);
  var putcoiIncreasecount = 0;
  var putcoidecreasecount = 0;
  var putLtpIncreasecount = 0;
  var putLtpdecreasecount = 0;

  var putOTMview = {};
  if (niftyPutsp1data.data.length < 2) {
    putOTMview.putcoi = '';
    putOTMview.putltp = '';
    putOTMview.signal = 'NA';
    return;
  }

  var prevdata = niftyPutsp1data.data[niftyPutsp1data.data.length - 2];
  var lastdata = niftyPutsp1data.data[niftyPutsp1data.data.length - 1];
  console.log('lastdata ', lastdata, prevdata);

  //check for COI and LTP increase compare to last premium
  if (lastdata.putcoi > prevdata.putcoi) {
    putcoiIncreasecount = putcoiIncreasecount + 1;
  }
  else if (lastdata.putcoi < prevdata.putcoi) {
    putcoidecreasecount++;
  }

  if (lastdata.putltp > prevdata.putltp) {
    putLtpIncreasecount = putLtpIncreasecount + 1;
  }
  else if (lastdata.putltp < prevdata.putltp) {
    putLtpdecreasecount++;
  }

  prevdata = niftyPutsp2data.data[niftyPutsp2data.data.length - 2];
  lastdata = niftyPutsp2data.data[niftyPutsp2data.data.length - 1];
  //check for COI and LTP increase compare to last premium
  if (lastdata.putcoi > prevdata.putcoi) {
    putcoiIncreasecount = putcoiIncreasecount + 1;
  }
  else if (lastdata.putcoi < prevdata.putcoi) {
    putcoidecreasecount++;
  }


  if (lastdata.putltp > prevdata.putltp) {
    putLtpIncreasecount = putLtpIncreasecount + 1;
  }
  else if (lastdata.putltp < prevdata.putltp) {
    putLtpdecreasecount++;
  }

  prevdata = niftyPutsp3data.data[niftyPutsp3data.data.length - 2];
  lastdata = niftyPutsp3data.data[niftyPutsp3data.data.length - 1];
  if (lastdata.putcoi > prevdata.putcoi) {
    putcoiIncreasecount = putcoiIncreasecount + 1;
  }
  else if (lastdata.putcoi < prevdata.putcoi) {
    putcoidecreasecount++;
  }

  if (lastdata.putltp > prevdata.putltp) {
    putLtpIncreasecount = putLtpIncreasecount + 1;
  }
  else if (lastdata.putltp < prevdata.putltp) {
    putLtpdecreasecount++;
  }

  if (putcoiIncreasecount > putcoidecreasecount && putLtpIncreasecount > putLtpdecreasecount) {
    putOTMview.putcoi = 'Increase';
    putOTMview.putltp = 'Increase';
    putOTMview.signal = 'PUT BUY (LONG)';

  }
  else if (putcoiIncreasecount < putcoidecreasecount && putLtpIncreasecount > putLtpdecreasecount) {
    putOTMview.putcoi = 'Decrease';
    putOTMview.putltp = 'Increase';
    putOTMview.signal = 'PUT BUY (Short Covering)';
  }
  else if (putcoiIncreasecount > putcoidecreasecount && putLtpIncreasecount < putLtpdecreasecount) {
    putOTMview.putcoi = 'Increase';
    putOTMview.putltp = 'Decrease';
    putOTMview.signal = 'PUT Sell (PUT Writing)';
  }
  else if (putcoiIncreasecount < putcoidecreasecount && putLtpIncreasecount < putLtpdecreasecount) {
    putOTMview.putcoi = 'Decrease';
    putOTMview.putltp = 'Decrease';
    putOTMview.signal = 'PUT Sell (Long Unwinding)';
  }
  else {
    putOTMview.putcoi = null;
    putOTMview.putltp = null;
    putOTMview.signal = null;
  }


  return putOTMview;
}


function getSPDataForBackTest(sp, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall) {
  console.log('inside getSPDataForBackTest ', entity);
  return new Promise((resolve, reject) => {

    var data1 = null;
    var filename = "sp" + sp + ".json";
    var filetoread = path.join(globalvar.BASE_DATA_DIR, filename);
    console.log('Checking file ', filetoread);
    if (fs.existsSync(filetoread)) {
      data1 = [];
      console.log('Reading file ', filetoread);
      var day = null;
      var month = null;
      var year = null;
      var hours = null;
      var minutes = null;
      fs.readFileSync(filetoread, 'utf-8').split(/\r?\n/).forEach(function (line) {
        try {
          //var match = /\r|\n/.exec(line);

          // console.log('LINE **** ', line, line.length);
          if (!globalvar.IsNullorUndefined(line) && line.length > 5) {

            var obj = JSON.parse(line);
            console.log('OBJECT   &&& ', obj);
            if (!processall) {
              var splitdate = obj.date.split('-');
              day = splitdate[0];
              month = splitdate[1];
              year = splitdate[2];

              var splittime = obj.time.split(':');
              hours = splittime[0];
              minutes = splittime[1];

              var currtime = new Date(year, month, day, hours, minutes, 0, 0);

              var splitfromtime = obj.time.split('-');
              var splittotime = obj.time.split('-');
              var currtime = new Date(year, month, day, hours, minutes, 0, 0);
              var starttime = null;
              var endtime = null;
            }
            //var processall = false;
            if (!globalvar.IsNullorUndefined(inputhr1) && !globalvar.IsNullorUndefined(inputmin1)) {
              starttime = new Date(year, month, day, inputhr1, inputmin1, 0, 0);
              endtime = new Date(year, month, day, inputhr2, inputmin2, 0, 0);
            }
            else {
              processall = true;
            }

            if (processall || (currtime >= starttime && currtime <= endtime)) {

              if (filename == "spnifty.json") {
                data1.push(obj);
              }
              else if (entity == "volume") {
                console.log(' Selected Time - volume ', currtime);
                obj.callvolume = obj.callvolume / 1000;
                obj.putvolume = obj.putvolume / 1000;
                data1.push(obj);
              }
              else if (entity == "coi") {
                console.log(' Selected Time - COI ', currtime);
                obj.callvolume = obj.callvolume / 100000;
                obj.putvolume = obj.putvolume / 100000;
                data1.push(obj);
              }

            }
          }
          //console.log('split data ', year, month, day, hours, minutes);
          //console.log(fromDate);
        }
        catch (e) {
          console.log('line is not json ', e);
          //return res.send({ data: data1 });
        }

      })

      console.log('DATTT1 ', data1);
      if (!IsNullorUndefined(data1)) {
        resolve(data1); // fulfilled
      } else {
        var reason = new Error('item.nifty is null');
        reject(null); // reject
      }
    }
    else {
      var msg = 'file does not exist ' + sp1;
      console.log(msg);
      var reason = new Error(msg);
      reject(null); // reject
    }

  })
}


router.post('/backtest', function (req, res) {

  var data1 = [];
  var data2 = [];
  var data3 = [];
  var data4 = [];
  var data5 = [];
  var niftydata = [];
  console.log('inside nifty option backtest API..... ', req.body.entity);

  var splittime1 = null;
  var inputhr1 = null;
  var inputmin1 = null;
  var input2 = null;
  var splittime2 = null;
  var inputhr2 = null;
  var inputmin2 = null;

  //Inputs
  var inputobj = req.body.input;
  var input1 = req.body.fromtime;
  var processall = false;
  if (!globalvar.IsNullorUndefined(input1)) {
    splittime1 = input1.split(':');
    inputhr1 = splittime1[0];
    inputmin1 = splittime1[1];
  }
  else {
    processall = true;
  }
  if (!globalvar.IsNullorUndefined(input2)) {
    input2 = req.body.totime;
    splittime2 = input2.split(':');
    inputhr2 = splittime2[0];
    inputmin2 = splittime2[1];
  }
  console.log('inputtime 1 ' + inputhr1 + inputmin1);
  console.log('inputtime 2 ' + inputhr2 + inputmin2);
  // Read Json file sp1
  var sp1 = req.body.sp1;
  var sp2 = req.body.sp2;
  var sp3 = req.body.sp3;
  var sp4 = req.body.sp4;
  var sp5 = req.body.sp5;
  var entity = req.body.entity;
  var fetchitems = 100;

  if (!globalvar.IsNullorUndefined(sp1)) {
    getSPDataForBackTest(sp1, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
      .then
      (data => {
        if (!globalvar.IsNullorUndefined(data)) {
          data1 = data;
        }
        getSPDataForBackTest(sp2, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
          .then
          (data => {
            if (!globalvar.IsNullorUndefined(data)) {
              data2 = data;
            }

            getSPDataForBackTest(sp3, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
              .then
              (data => {
                if (!globalvar.IsNullorUndefined(data)) {
                  data3 = data;
                }

                getSPDataForBackTest(sp4, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
                  .then
                  (data => {
                    if (!globalvar.IsNullorUndefined(data)) {
                      data4 = data;
                    }

                    getSPDataForBackTest(sp5, inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
                      .then
                      (data => {
                        if (!globalvar.IsNullorUndefined(data)) {
                          data5 = data;
                        }
                        getSPDataForBackTest('nifty', inputhr1, inputmin1, inputhr2, inputmin2, entity, processall)
                          .then
                          (data => {
                            if (!globalvar.IsNullorUndefined(data)) {
                              niftydata = data;
                            }

                            console.log('nifty data %%%% ');
                            var splist = [];
                            splist.push(sp1);
                            splist.push(sp2);
                            splist.push(sp3);
                            console.log('INPUT SP LIST ', splist);
                            BackTestCalculateTotalCOIForSelectedSPs(splist, data1, data2, data3)
                              .then(sumdata => {
                                res.send({
                                  data1: data1, data2: data2, data3: data3,
                                  data4: data4, data5: data5, niftydata: niftydata, sumdata: sumdata
                                });
                              });

                          });
                      });
                  });

              });

          });

      });
  }
  else {
    res.send({ msg: 'INVALID SP' });
  }

});

function BackTestCalculateTotalCOIForSelectedSPs(splist, data1, data2, data3) {
  console.log('incoming BackTestCalculateTotalCOIForSelectedSPs ', splist);
  return new Promise((resolve, reject) => {
    var sumdata = [];
    var niftyspdata = [];
    niftyspdata.push(data1);
    niftyspdata.push(data2);
    niftyspdata.push(data3);

    // calculate total coi
    for (let index = 0; index < niftyspdata.length; index++) {
      var time = "0";
      var element = niftyspdata[index];
      console.log('element ', element);
      for (let k = 0; k < element.length; k++) {
        var temp = element[k];

        console.log('****** temp callcoi ***** ', temp.callcoi, element.sp);
        var time = temp.time;
        var found = _.find(sumdata, { time: time });
        if (globalvar.IsNullorUndefined(found)) {
          //totalcallcoi = totalcallcoi + temp.callcoi;
          //totalputcoi = totalputcoi + temp.putcoi;
          sumdata.push({ time: time, callcoi: temp.callcoi, putcoi: temp.putcoi });
        }
        else {
          console.log('inside else --->>> updating existing object');
          found.callcoi += temp.callcoi;
          found.putcoi += temp.putcoi;
        }

      }

    }

    resolve(sumdata);
    //   
    //console.log('SP data ', spdata);
  })
}



module.exports = {
  router: router,
  CheckForOptionData: CheckForOptionData
}
//module.exports = router;