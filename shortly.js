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
// app.use(util.verifyUser);

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

    const pass = req.body.password
    const username = req.body.username
    new User({username: username}).fetch().then(function(user){
      if(user){
        if(user.verifyPassword(pass)){
          console.log('ure logged in mang')
          req.session.user = user;
          res.redirect('/');
        } else {
          res.send('wrong password');
        }
      } else {
        // res.send('wrong username bro');
        res.redirect('/login')
      }
    })
});


app.get('/login', 
  function(req, res){
    res.render('login')
});

app.get('/signup', 
  function(req, res){
    res.render('signup')
});

app.get('/logout', function(req, res){
  // console.log('sess: ',req.session)
  req.session.user = null;
  res.redirect('/login')
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
