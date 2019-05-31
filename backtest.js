
var osmosis = require('osmosis');
var fs = require('fs');
var jsonfile = require('jsonfile');
var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    app = express();

var cors = require('cors');
var lodash = require('lodash');
var moment = require('moment');
const readLastLine = require('read-last-line');

var globalvar = require('./common/globalvar');
var niftyoptions = require('./routes/niftyoptiondata.js');

const html = path.join(__dirname, 'build');
var dt = new Date();

app.use(cors());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(html));

app.use('/niftyoptiondata', function (req, res, next) {
    console.log("A new niftyoptiondata request received at " + Date.now());
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers , *");
    next();
});



app.use('/niftyoptiondata', niftyoptions.router);
var port = process.env.PORT || 8081;

var niftydata = 'niftydata';
var BASE_DATA_DIR = path.join(__dirname, niftydata);

app.get('/niftyopen', function (req, res) {
    console.log('inside niftyopen ');

    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`https://www.nseindia.com/live_market/dynaContent/live_watch/live_index_watch.htm`);

        const data = await page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('table tr td'))
            return tds.map(td => td.innerHTML)
        });

        //You will now have an array of strings
        //[ 'One', 'Two', 'Three', 'Four' ]
        console.log(data);
        res.send({ IndexData: data[0] });
        //One
        //console.log(data[0]);
        await browser.close();
    })();

});


app.get('/*', function (req, res) {
    // res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // res.send();

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


function beep() {
    process.stdout.write('\x07');
}

var server = app.listen(port, function () {

    console.log('listening ', port);
    globalvar.backtest = true;
    if (globalvar.backtest) {
        console.log('started server to backtest data');
        return;
    }
    if (!fs.existsSync(globalvar.BASE_DATA_DIR)) {
        fs.mkdirSync(globalvar.BASE_DATA_DIR);
        console.log('dir created ', globalvar.BASE_DATA_DIR);
        niftyoptions.CheckForOptionData();
    }
    else {
        fs.readdir(globalvar.BASE_DATA_DIR, (err, files) => {
            if (err)
                console.log('error in readdir ', err);
            else {
                //for (const file of files) {
                for (let index = 0; index < files.length; index++) {
                    var file = files[index];
                    fs.unlink(path.join(globalvar.BASE_DATA_DIR, file), err => {
                        if (err)
                            console.log('error while deleting files ', err);;
                    });
                }
            }

            console.log('OLD FILES DELETED');
            console.log('NEW DAY STARTED .............');
            niftyoptions.CheckForOptionData();

        });
    }

});


