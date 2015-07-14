//Declaring raquired modules for node.js

var mongoUrl = 'mongodb://localhost:27017/regdata';
var MongoStore = require('connect-mongo')(expressSession);
var mongo = require('./mongo');


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




//function to create password salt
function createSalt(){
  var crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

//Function to create password hash
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

//function to save a draft submitted by the user
function saveDraft(username, pno, statement, solution, finalsolution, callback){

  var coll = mongo.collection('dfansdata');

coll.find({username:username,pno:pno}).toArray(function(err,draftdata){
  if(draftdata.length!=1)
  {
  coll.count(function(err, count){
        assert.equal(null, err);
		++count;
		var draftObject = {
	  dno:count,
      username: username,
	  pno: pno,
	  statement:statement,
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
    else {
            coll.update({username:username,pno:pno},{$set:{finalans:finalsolution}},function(err,user){
              callback(err,user);
            });
    }
	});
  }



//function to save a comment submitted by the user
function saveComment(comment, dno, commenton, commentby, callback){

  var coll = mongo.collection('commentdata');


		var commentObject = {
	  comment:comment,
      dno: dno,
	  commenton: commenton,
	  commentby:commentby,

    };


        // insert drafts into database
        coll.insert(commentObject, function(err,user){
          callback(err,user);
        });
		var collection = mongo.collection('dfansdata');
	collection.update({dno: parseInt(dno)},{$inc:{commentcount:1}}, function(err, object) {
																					if (err){
																								console.warn(err.message);  // returns error if no matching object found
																							}else{


																									}
  });
  }
function saveGrade(feedback, dno, gradeon, gradeby, grade, callback){

  var coll = mongo.collection('gradedata');


		var gradeObject = {
	  grade:parseInt(grade),
    feedback:feedback,
      dno: dno,
	  gradeon: gradeon,
	  gradeby:gradeby


    };


        // insert drafts into database
        coll.insert(gradeObject, function(err,user){
          callback(err,user);
        });
		var collection = mongo.collection('dfansdata');
	collection.update({dno:parseInt(dno)},{$inc:{fgcount:1}}, function(err, object) {
																					if (err){
																								console.warn(err.message);  // returns error if no matching object found
																							}else{


																									}
  });
  }
//Function to input problems
function enterData(modno,statement, hint, solution, callback){
  var coll = mongo.collection('stmtdata');

  coll.count(function(err, count) {
        assert.equal(null, err);
		++count;
		var stmtObject = {
	  sno:count,
	  modno:modno,
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
    if(user)
    {
      if(user.userrole==='admin')
	     {
		// This way subsequent requests will know the user is logged in.
          req.session.username = user.username;

            res.redirect('/enterdata');
	         }
	          else {
              // This way subsequent requests will know the user is logged in.
              req.session.username = user.username;

              res.redirect('/userscreen');
    }
  }
   else {
      res.render('login', {badCredentials: true});
    }
  });
});

app.use('/public', express.static('public'));

mongo.connect(mongoUrl, function(){
  console.log('Connected to mongo at: ' + mongoUrl);
  
})