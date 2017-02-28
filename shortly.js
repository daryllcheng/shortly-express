var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({ 
  secret: 'keyboard cat', 
  cookie: { maxAge: 60000 },
  resave: false,
  saveUninitialized: true
}));


app.use(util.loggify)

app.get('/', util.verifyUser,
function(req, res) {
  res.render('index');
});

app.get('/create', util.verifyUser,
function(req, res) {
  res.render('index');
});

app.get('/links', util.verifyUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  // console.log('req link: ', req)
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login', 
  function(req, res){
    // console.log('login page infos: ' ,req.body, req.method, req.url)
    const pass = req.body.password
    const username = req.body.username

    new User({username: username}).fetch().then(function(user){
      // console.log('user attributes', user.attributes)
      if(user){
        if(user.verifyPassword(pass)){
          console.log('ure logged in mang')
          // var sess = req.session;
          // sess.loggedIn = true;
          // sess.user = user;
          // util.addUserToSession(user)
          req.session.user = user;
          // res.end();
          res.redirect('/');
        } else {
          res.send('wrong password');
        }
      } else {
        res.status(404).send('wrong username bro');
      }
      // console.log('we got user: ', user);
      // console.log('we got his pass: ', user.get('password'));
    })
    //construct a query: "SELECT * FROM USERS", check the database for the username
    //if the query returns true for user, check the password against the user's password
    //if true, then redirect to home page, with a session enabled by using req.session.user = user
    // else redirect to login page again and tell user bad username or password
});

//Daryl will impelment logout later


app.get('/login', 
  function(req, res){
    res.render('login')
});

app.get('/signup', 
  function(req, res){
    res.render('signup')
});

app.post('/signup', function(req, res){
  const { username, password } = req.body;
  new User( { username } ).fetch().then(function(user){
    if(user){
      res.send('username already exists')
    } else {
      new User({ username, password }).save().then(function(user){
        req.session.user = user;
        res.redirect('/');
      })
    }
  })

})

// app.get('/index', 
//   function(req, res){
//     res.render('index')
// });

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
