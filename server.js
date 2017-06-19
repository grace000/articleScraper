
// Dependencies
//-----------------------------------------------------------------------
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Snatches HTML from URLs
var request = require('request');
// Scrapes our HTML
var cheerio = require('cheerio');

//Handlebars
var exphbs = require("express-handlebars");


// Set up a static folder (public) for our web app
app.use(express.static("public"));

// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//---------------------------------------------------------------------

// // Database configuration
// // Save the URL of our database as well as the name of our collection
// var databaseUrl = "scrapedArticlesDB";
// var collections = ["atlanticArticles"];

// // Use mongojs to hook the database to the db variable
// var db = mongojs(databaseUrl, collections);

// MongoDB configuration 
var config = require("./config/config.js");
mongoose.connect(config);
var db = mongoose.connection;

// This makes sure that any errors are logged if mongodb runs into an issue
db.on("error", function(error) {
  console.log("Database Error:", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

//Routes
//---------------------------------------------------------------------------

// A GET request to scrape the atlantic website
app.get("/scrape", function(req, res) {

  // Make a request call to grab the HTML body from the site of your choice
  request('https://www.theatlantic.com/latest/', function (error, response, html) {

  	// Load the HTML into cheerio and save it to a variable
    // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
    var $ = cheerio.load(html);

    // Select each instance of the HTML body that you want to scrape
    // NOTE: Cheerio selectors function similarly to jQuery's selectors, 
    // but be sure to visit the package's npm page to see how it works
    $('article blog-article').each(function(i, element){

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

     //  db.collection("articles").insert(result, function(err, res) {
  	  //   if (err) throw err;
  	  //   console.log("Number of records inserted: " + res.count);
  	  // });
     //  });

    	// db.collection("articles").count(result, function(err, res){
    	// 	if (err) throw err;
    	// });

    console.log(result);
  });
    // Tell the browser that we finished scraping the text
    res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {

  //Grab ever doc in the Articles array
  Article.find({}, function(error, doc) {
    //Log any errors
    if (error) {
      console.log(error);
    }
    res.render('main', {articles: doc});
  });
});

// This will grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  //Using the id passed in the id parameter, prepare a query that finds the match in our db
  Article.findOne({"_id": req.params.id})

  //..and populate all of the notes associated with it
  .populate("note")

  //now, execute our query
  .exec(function(error, doc){
    //log errors
    if (error) {
      console.log(error);
    }
    //otherwise, send the doc to the browser
    else{
      res.json(doc);
    }
  });
});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  //Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  //Save the new note to the db
  newNote.save(function(error, doc){
    //log errors
    if (error) {
      console.log(error);
    }
    else {
      //use article id to find and update it's note
      Article.findOneAndUpdate({"_id": req.params.id}, {"note": doc._id})

      //Exevute the above query
      .exec(function(err, doc){
        //log errors
        if(err) {
          console.log(err);
        }
        else {
          //send documetn to the browser
          res.send(doc);
        }
      });
    }
  });
});

// Listen on port 3306
app.listen(3306, function() {
  console.log("App running on port 3306!");
});
