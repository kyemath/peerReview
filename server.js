//Declaring raquired modules for node.js
var express = require('express');
var app = express();
var expressSession = require('express-session');
var expressHbs = require('express3-handlebars');
var mongoUrl = 'mongodb://localhost:27017/regdata';
var MongoStore = require('connect-mongo')(expressSession);
var mongo = require('./mongo');
assert = require('assert');
var port = 3333; // port number which we are using for node server


// to check whether the user is looged in or not while giving access to confidential pages
function requireUser(req, res, next){
  if (!req.user) {
    res.redirect('/not_allowed');
  } else {
    next();
  }
}

// This middleware checks if the user is logged in and sets req.user and res.locals.user appropriately if so.
function checkIfLoggedIn(req, res, next){
  if (req.session.username) {
    var coll = mongo.collection('users');
    coll.findOne({username: req.session.username}, function(err, user){
      if (user) {
        // set a 'user' property on req so that the 'requireUser' middleware can check if the user is logged in
        req.user = user;
        
        // Set a res.locals variable called 'user' so that it is available to every handlebars template.
        res.locals.user = user;
      }
      
      next();
    });
  } else {
    next();
  }
}

// Use this so we can get access to `req.body` in our posted forms.
app.use( require('body-parser')() );

// We need to use cookies for sessions, so use the cookie parser 
app.use( require('cookie-parser')() );

app.use( expressSession({
  secret: 'somesecretrandomstring',
  store: new MongoStore({
    url: mongoUrl
  })
}));

// We must use this middleware _after_ the expressSession middleware,
// because checkIfLoggedIn checks the `req.session.username` value,
// which will not be available until after the session middleware runs.
app.use(checkIfLoggedIn);


//set up of view engine
app.engine('html', expressHbs({extname:'html', defaultLayout:'main.html'}));
app.set('view engine', 'html');

//To get home page
app.get('/', function(req, res){
  var coll = mongo.collection('stmtdata');
  coll.find({}).toArray(function(err, stmtdata){
    res.render('index.html', {stmtdata:stmtdata});  
  })
});

//To get login page
app.get('/login', function(req, res){
  res.render('login');
});

//To get logout page
app.get('/logout', function(req, res){
  delete req.session.username;
  res.redirect('/');
});

//To get a restriction notice page
app.get('/not_allowed', function(req, res){
  res.render('not_allowed');
});

// The secret url includes the requireUser middleware.
app.get('/secret', requireUser, function(req, res){
  res.render('secret');
});

//To get signup page
app.get('/signup', function(req,res){
  res.render('signup');
});


//To get page to input problem statements
app.get('/enterdata', function(req,res){
  res.render('enterdata');
});

//To get drafts page
app.get('/drafts', function(req,res){
var coll = mongo.collection('stmtdata');
  coll.find({}).toArray(function(err, stmtdata){
    res.render('drafts', {stmtdata:stmtdata});
});
});

//A page to review the drafts
app.get('/reviewdrafts', function(req,res){
var coll = mongo.collection('dfansdata');
  coll.find({}).toArray(function(err, drafts){
    res.render('reviewdrafts', {drafts:drafts});
});
});

//To get the desired problem to provide the draft
app.get('/inputdraft', function(req,res){
var coll = mongo.collection('stmtdata');
var stmtno=parseInt(req.session.value);
coll.findOne({sno: stmtno}, function(err, document) {
  res.render('inputdraft', {document:document});
});
 
});

app.get('/reviewdrafts', function(req,res){
  res.render('reviewdrafts');
});
app.get('/gradefinal', function(req,res){
  res.render('gradefinal');
});

app.get('/userscreen', function(req,res){
var coll = mongo.collection('stmtdata');
  coll.find({}).toArray(function(err, stmtdata){
    res.render('userscreen', {stmtdata:stmtdata});
});
});

function createSalt(){
  var crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

function createHash(string){
  var crypto = require('crypto');
  return crypto.createHash('sha256').update(string).digest('hex');
}


//Function to created a new user
function createUser(firstname, lastname, username, password, password_confirmation, email, userrole, callback){
  var coll = mongo.collection('users');
  
  if (password !== password_confirmation) {
    var err = 'The passwords do not match';
    callback(err);
  } else {
    var query      = {username:username};
    var salt       = createSalt();
    var hashedPassword = createHash(password + salt);
    var userObject = {
	  firstname: firstname,
	  lastname: lastname,
      username: username,
	  email: email,
	  userrole: userrole,
      salt: salt,
      hashedPassword: hashedPassword,
    };
	

    
    // make sure this username does not exist already
    coll.findOne(query, function(err, user){
      if (user) {
        err = 'The username you entered already exists';
        callback(err);
      } else {
        // create the new user
        coll.insert(userObject, function(err,user){
          callback(err,user);
        });
      }
    });
  }
}

//To get the data from signup form
app.post('/signup', function(req, res){
  // The variables below all come from the form in views/signup.html
   var firstname = req.body.firstname;
    var lastname = req.body.lastname;
  var username = req.body.username;
  var password = req.body.password;
  var password_confirmation = req.body.password_confirmation;
  var email = req.body.email;
   var userrole = req.body.userrole;
  
  createUser(firstname, lastname,username, password, password_confirmation, email, userrole, function(err, user){
    if (err) {
      res.render('signup', {error: err});
    } else {
      
      // This way subsequent requests will know the user is logged in.
      req.session.username = user.username;
      
      res.redirect('/');  
    }
  });
});

//to get data from inputdraft form
app.post('/inputdraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;
  
      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  req.session.value=req.body.selected;
      res.redirect('/inputdraft');  
});

//function to save a draft submitted by the user
function saveDraft(username, pno, solution, callback){
  
  var coll = mongo.collection('dfansdata');
  
  coll.count(function(err, count) {
        assert.equal(null, err);
		++count;
		var draftObject = {
	  dno:count,
      username: username,
	  pno: pno,
      draft: solution,
	  finalans : "NA",
	  fgcount : 0,
	  commentcount : 0
	  
    };
    
    
        // insert drafts into database 
        coll.insert(draftObject, function(err,user){
          callback(err,user);
        });
	});     
  }
app.post('/savedraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
  var username=req.user.username;
  var solution=req.body.solution;
  var pno=req.session.value;
     saveDraft(username, pno, solution, function(err, user){
    if (err) {
      res.render('inputdraft', {error: err});
    } else { 

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  
      res.redirect('/userscreen');  
	  
    }
  });
  
	  
});


//Function to input problems
function enterData(statement, hint, solution, callback){
  var coll = mongo.collection('stmtdata');
  
  coll.count(function(err, count) {
        assert.equal(null, err);
		++count;
		var stmtObject = {
	  sno:count,
      statement: statement,
	  hint: hint,
      solution: solution
    };
    
    
        // create the new Problem 
        coll.insert(stmtObject, function(err,user){
          callback(err,user);
        });
	});     
  }


app.post('/enterdata', function(req, res){
  // The 3 variables below all come from the form
  // in views/signup.hbs
  var statement = req.body.statement;
  var hint = req.body.hint;
  var solution = req.body.solution;

  
  enterData(statement, hint, solution, function(err, user){
    if (err) {
      res.render('enterdata', {error: err});
    } else {
      
      // This way subsequent requests will know the user is logged in.
      req.session.username = user.username;
      
      res.redirect('/');  
    }
  });
});




// This finds a user matching the username and password that were given.
function authenticateUser(username, password, callback){
  var coll = mongo.collection('users');
  
  coll.findOne({username: username}, function(err, user){
    if (err) {
      return callback(err, null);
    }
    if (!user) {
      return callback(null, null);
    }
    var salt = user.salt;
    var hash = createHash(password + salt);
    if (hash === user.hashedPassword) {
      return callback(null, user);
    } else {
      return callback(null, null);
    }
  });
}

app.post('/login', function(req, res){
  // These two variables come from the form on
  // the views/login.hbs page
  var username = req.body.username;
  var password = req.body.password;
  
  authenticateUser(username, password, function(err, user){
    if(user.userrole==='admin')
	{
		// This way subsequent requests will know the user is logged in.
      req.session.username = user.username;

      res.redirect('/enterdata');
	}
	else if (user) {
      // This way subsequent requests will know the user is logged in.
      req.session.username = user.username;

      res.redirect('/userscreen');
    } else {
      res.render('login', {badCredentials: true});
    }
  });
});

app.use('/public', express.static('public'));

mongo.connect(mongoUrl, function(){
  console.log('Connected to mongo at: ' + mongoUrl);
  app.listen(port, function(){
    console.log('Server is listening on port: '+port);
  });  
})


