var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/newsdb", { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with request
  axios.get("http://www.nytimes.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("h2").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).text();
      result.link = "https://www.nytimes.com" + $(this).parent().parent().attr("href");

      // If this found element had both a title and a link

      if (result.title && result.link) {
        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function (dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function (err) {
            // If an error occurred, send it to the client
            return res.json(err);
          });
      }
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // This section grabs all of the articles
  db.Article.find({})
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // TODO
  // ====
  // Find one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note

  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true })
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err)
    });
});

// Route for Update article from unsaved to saved 
app.get('/save/:id', function (req, res) {
  db.Article.findOneAndUpdate({ _id: req.params.id }, { saved: true }, { new: true }, function () {
    console.log("save ok");
  })
    .then(function (dbArticle) {
      res.render("index.html")
    }).catch(function (err) {
      res.json(err);
    });
});

// route for delete of a single article
app.get('/delete/:id', function (req, res) {
  db.Article.remove({ _id: req.params.id })
    .then(function (dbArticle) {
      res.render("index.html")
    }).catch(function (err) {
      res.json(err);
    });
})

// NOT WORKING DELETE PARENT AND CHILDREN
// https://stackoverflow.com/questions/14348516/cascade-style-delete-in-mongoose
// app.get('/delete/:id', function (req, res) {
//   db.Articles.pre('remove', function (next) {
//     // 'this' is the client being removed. Provide callbacks here if you want
//     // to be notified of the calls' result.
//     db.Notes.remove({ _id: req.params.id }).exec();
//     next();
//   })
//     .then(function (dbArticle) {
//       res.render("index.html")
//     })
// })





// Route for getting all Saved Articles from the db
app.get('/api/saved', function (req, res) {
  db.Article.find({
    saved: true
  }).then(function (dbArticle) {
    res.json(dbArticle);
  }).catch(function (err) {
    res.json(err);
  });
});

app.get("/saved/:id", function (req, res) {
  // Find one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});


// Route for grabbing a specific Saved Article by id, populate it with it's note
app.get('/api/saved/:id', function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .then(function (dbArticle) {
      console.log('success');
      return;
    }).catch(function (err) {
      res.json(err);
    });
})

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
