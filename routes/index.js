var express = require('express');
var request = require('request');
var mysql = require('mysql');
var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
var conn = mysql.createConnection({
    host: 'http://121.42.176.30',
    // host: 'localhost',
    user: 'root',
    // password: 'root',
    password: 'xidian@513',
    database: 'douyu',
    port: 3306
});
// var laifeng = require('../models/laifeng.js');
var EventEmitter = require('events').EventEmitter;
var myEvents = new EventEmitter();
var router = express.Router();

// var page = 0;
var start = 0;
var isFinish = false;
// var count = 0;
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/update', function (req, res) {
    if (start == 0) {
        sub();
    } else {
        return res.json({err: '正在传输数据中...'})

    }
    return res.json({success: 'copy that'});
});

var mypretime = 0;
function sub() {
    var Today = new Date();
    var NowHour = Today.getHours();
    var NowMinute = Today.getMinutes();
    var NowSecond = Today.getSeconds();
    var mysec = (NowHour * 3600) + (NowMinute * 60) + NowSecond;
    if ((mysec - mypretime) > 10) {
//10只是一个时间值，就是10秒内禁止重复提交，值随便设
        mypretime = mysec;
    } else {
        return;
    }
    myEvents.emit('longzhu');
}

myEvents.on('longzhu', function () {
    var times = [];
    for (var i = 0; i < 60; i = i + 10) {
        times.push(i);
    }

    rule.second = times;
    schedule.scheduleJob(rule, function () {
        if (isFinish) {
            start = 0;
            isFinish = false;
            var Today = new Date();
            var NowHour = Today.getHours();
            var NowMinute = Today.getMinutes();
            var NowSecond = Today.getSeconds();
            var nowsec = (NowHour * 3600) + (NowMinute * 60) + NowSecond;
            console.log('执行时间为：' + nowsec - mypretime);
            console.log('update success');
            this.cancel();
        } else {
            selectAndSend();
        }
    });
});


function selectAndSend() {
    var limit_range = start * 10 + ',' + 10;
    var sql = 'SELECT * FROM laifeng where owner_uid = 0 ORDER BY id desc limit ' + limit_range + ';';
    conn.query(sql, function (err, rows) {
        if (err) {
            return console.log(err);
        }
        if (rows.length > 0) {
            start++;
            for (var i = 0; i < rows.length; i++) {
                myEvents.emit('updateOther', rows[i].room_id);
            }
        } else {
            isFinish = true;
            return;
        }
    });
}

myEvents.on('updateOther', function (room_id) {
    var options = {
        method: 'GET',
        // encoding: null,
        url: 'http://v.laifeng.com/' + room_id
    };

    request(options, function (err, response, body) {
        if (err) {
            return console.log(room_id + err);
        }
        // var fans = 0;
        try {
            var face = body.substring(body.indexOf('anchorFaceUrl') + 14, body.indexOf('anchorFansNum')).trim().replace(/,$/, "").replace(/\'|’|‘/g, "");
            var fans = body.substring(body.indexOf('FansNum:') + 8, body.indexOf('anchorHadBeans')).trim().replace(/,$/, "");
            // var userId = body.substring(body.indexOf('userId:') + 7, body.indexOf('userName')).trim().replace(/,$/, "").replace(/\'|’|‘/g, "");
            var owner_uid = body.substring(body.indexOf('anchorId:') + 9, body.indexOf('isGold')).trim().replace(/,$/, "").replace(/\'|’|‘/g, "");
            var nickname = body.substring(body.indexOf('anchorName:') + 11, body.indexOf('anchorLevel')).trim().replace(/,$/, "").replace(/\'|’|‘/g, "");
            var tag = body.substring(body.lastIndexOf('anchorSign:') + 11, body.lastIndexOf('gender')).trim().replace(/,$/, "").replace(/\'|’|‘/g, "");

        } catch (e) {
            return console.log(room_id + "----net---" + e);
        }
        myEvents.emit('updateInfo', fans, face, owner_uid, nickname, tag, room_id);
    });
});

myEvents.on('updateInfo', function (fans, face, owner_uid, nickname, tag, room_id) {
    var sql = 'UPDATE laifeng SET fans = ?,face = ?,owner_uid = ?,nickname = ?, tags = ? WHERE room_id = ?';
    var parms = [fans, face, owner_uid, nickname, tag, room_id];
    conn.query(sql, parms, function (err) {
        if (err) {
            return console.log(err + "---sql---");
        }
    })
});

module.exports = router;
// 23337