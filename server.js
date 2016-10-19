var express = require('express');
var crypto = require('crypto');

var app = express();

var port = process.env.PORT || 8080;

var MongoClient = require('mongodb').MongoClient; // save as 4 char base64 url safe string

var url = process.env.MONGODB_URL;
var collectionName = "urls"

var urlRegex = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

var db;

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, mongodb) {
  if (err) throw err;
  console.log("Connected correctly to server");
  db = mongodb;
});

var collection = function( name ) {
  return db.collection( name );
};


app.get('/', (req, res) => {
    res.end("Access the api with a long url as the path:\n\n ie. http://thissite/http://www.example.com");
});

app.get(/^\/([0-9a-zA-Z\-_]{4})$/, (req, res) => {
    var searchUid = req.params[0];
    console.log(searchUid);
    collection(collectionName).findOne({
        "uid": searchUid
    }, (err, data) => {
       if (err) throw err;
       
       if (data) {
           console.log("redirect to: " + data.url);
           res.redirect(302, data.url);
       } else {
           console.log("error with key: " + searchUid);
           res.json({"error":"That key does not exist. Please try another key."});
       }
    });
});

app.get('/new/*', (req, res) => {
    var longurl = req.url.slice(5);
    if (longurl.match(urlRegex) && longurl != "favicon.ico") {
        var rand = crypto.randomBytes(3);
        var uid = rand.toString('base64')
                    .replace(/[+\/]/, c => c === "+" ? "-" : "_");
        
        collection(collectionName).findOne({
            "url": longurl
        }, (err, data) => {
            if (err) throw err;
            
            if (data) {
                console.log("Link already exists! replay link.");
                res.json({
                    "original_url": longurl,
                    "short_url": "https://" + req.headers.host + "/" + data.uid
                });
            } else {
                collection(collectionName).insert({
                    "uid": uid,
                    "url": longurl
                },
                (err, data) => {
                    if (err) throw err;
                    console.log("Successfully added item.");
                    res.json({
                        "original_url": longurl,
                        "short_url": "https://" + req.headers.host + "/" + uid
                    });
                });
            }
        });
    } else {
        res.json({"error":"Wrong url format, make sure you have a valid protocol and real site."});
    }
});

app.get('/*', (res, req) => {
    res.json({"error":"Wrong url format, make sure you have a valid protocol and real site."});
});

app.listen(port, () => {
    console.log("Listening on " + port);
});
