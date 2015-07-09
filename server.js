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

app.get('/selectmodule', function(req, res){
  res.render('selectmodule',{layout:false});
});


//To get page to input problem statements
app.get('/enterdata', function(req,res){
  res.render('enterdata');
});

//To get drafts page
app.get('/drafts', function(req,res){
var coll = mongo.collection('stmtdata');
  coll.find({modno:req.session.modno}).toArray(function(err, stmtdata){

	res.render('drafts', {stmtdata:stmtdata,layout:false});
});
});

//A page to review the drafts
app.get('/reviewdrafts', function(req,res){
var coll = mongo.collection('dfansdata');
  coll.find().toArray(function(err, drafts){
  var comcoll=mongo.collection('commentdata');
  comcoll.find().toArray(function(err,comdata){
  var resArray=[];
  var prblmno,username;
  var userPnoArray=[];
  for(var i=0,x=0;i<drafts.length;i++)
  {

	if(drafts[i]["username"]==req.user.username)
	{
		prblmno=drafts[i]["pno"];
		userPnoArray[x]=prblmno;
		x++;
	}
  }
  var comment_done=0;
  for(var i=0,x=0;i<drafts.length;i++)
  {
	prblmno=drafts[i]["pno"];
	if(drafts[i]["username"]!=req.user.username && parseInt(drafts[i]["commentcount"])<2 && userPnoArray.indexOf(prblmno)!=-1)
	{
		for(var k=0,y=0;k<comdata.length;k++)
  		{

  			if(comdata[k]["commentby"]==req.user.username && drafts[i]["dno"]==comdata[k]["dno"])
  			{
  				comment_done=1;
  			}
  		}
  		if(comment_done==0)
  		{
			resArray[x]=drafts[i];
			x++;
		}
		comment_done=0;
	}
  }

  res.render('reviewdrafts', {drafts:resArray,layout:false});
  });
});
});

//A page to grade solutions
app.get('/gradefinal', function(req,res){
var coll = mongo.collection('dfansdata');
  coll.find({$and:[{finalans:{$ne:'NA'}},{commentcount:2}]}).toArray(function(err, drafts){
    var gradecoll=mongo.collection('gradedata');
    gradecoll.find().toArray(function(err,gradedata){
    var resArray=[];
    var prblmno,username;
    var userPnoArray=[];
    for(var i=0,x=0;i<drafts.length;i++)
    {

  	if(drafts[i]["username"]==req.user.username)
  	{
  		prblmno=drafts[i]["pno"];
  		userPnoArray[x]=prblmno;
  		x++;
  	}
    }
    var comment_done=0;
    for(var i=0,x=0;i<drafts.length;i++)
    {
  	prblmno=drafts[i]["pno"];
  	if(drafts[i]["username"]!=req.user.username && parseInt(drafts[i]["fgcount"])<3 && userPnoArray.indexOf(prblmno)!=-1)
  	{
  		for(var k=0,y=0;k<gradedata.length;k++)
    		{

    			if(gradedata[k]["gradeby"]==req.user.username && drafts[i]["dno"]==gradedata[k]["dno"])
    			{
    				comment_done=1;
    			}
    		}
    		if(comment_done==0)
    		{
  			resArray[x]=drafts[i];
  			x++;
  		}
  		comment_done=0;
  	}
    }

    res.render('gradefinal', {drafts:resArray,layout:false});
    });
  });
  });


//comment on a draft
app.get('/commentondraft', function(req,res){
var coll = mongo.collection('dfansdata');
var ddno=parseInt(req.session.dvalue);
  coll.findOne({dno:ddno}, function(err, draft){

	res.render('commentondraft', {draft:draft,layout:false});

});
});
//grade on an answer
app.get('/gradeonanswer', function(req,res){
var coll = mongo.collection('dfansdata');
var ddno=parseInt(req.session.dvalue);
  coll.findOne({dno:ddno}, function(err, draft){

	res.render('gradeonanswer', {draft:draft,layout:false});

});
});
//To get the desired problem to provide the draft
app.get('/inputdraft', function(req,res){
var coll = mongo.collection('stmtdata');
var stmtno=parseInt(req.session.value);
coll.findOne({sno: stmtno}, function(err, document) {
  var draft_Collection=mongo.collection('dfansdata');
  draft_Collection.findOne({pno:req.session.value,username:req.user.username},function(err, record){
  var dnum=null;
  var finalanswer=null;
  var fg_count=null;
  if(record!=null)
  {
		dnum=record.dno;
		finalanswer=record.finalans;
		fg_count=record.fgcount;
  }
     var comment_Collection=mongo.collection('commentdata');
    comment_Collection.find({dno:""+dnum}).toArray(function(err, comments){
      var fans_exist=false,final=false;
      if(comments.length==2)
      final=true;
      if(finalanswer!="NA" && finalanswer!=null)
        fans_exist=true;
        var grade_coll=mongo.collection("gradedata");
        grade_coll.find({dno:""+dnum,gradeon:req.user.username}).toArray(function(err,gradedata){
          var avg=0;
          var avg_exist=false;
          if(fg_count==3)
          {
            for(var m=0;m<gradedata.length;m++)
            {
              avg+=gradedata[m]["grade"];
            }
            avg=avg/3;
            avg_exist=true;
          }

          res.render('inputdraft', {document:document,record:record,comments:comments,final:final,fans_exist:fans_exist,gradedata:gradedata,avg:avg,avg_exist:avg_exist,layout:false});
        });

});
});

});

});

//To get default user screen
app.get('/userscreen', function(req,res){
var coll = mongo.collection('stmtdata');
  coll.find({}).toArray(function(err, stmtdata){
    res.render('userscreen', {stmtdata:stmtdata});
});
});

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

app.post('/drafts', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  req.session.modno=req.body.moduleno;
    
      res.redirect('/drafts');
});
app.post('/commentondraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  req.session.dvalue=req.body.dselected;
      res.redirect('/commentondraft');
});
app.post('/gradeonanswer', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  req.session.dvalue=req.body.dselected;
      res.redirect('/gradeonanswer');
});
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


app.post('/savedraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
  var username=req.user.username;
  var solution=req.body.solution;
  var statement=req.body.statement;
  var pno=req.session.value;
  var finalsolution=req.body.finalsolution;
     saveDraft(username, pno, statement, solution, finalsolution, function(err, user){
    if (err) {
      res.render('inputdraft', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;

      res.render('selectmodule',{layout:false});

    }
  });


});

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
app.post('/savecomment', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html

  var commentby=req.user.username;
  var comment=req.body.comment;
  var commenton=req.body.commenton;
  var dno=req.body.dno;
     saveComment(comment, dno, commenton, commentby, function(err, user){
    if (err) {
      res.render('commentondraft', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = req.user.username;

      res.render('reviewdrafts',{layout:false});

    }
  });


});
//function to save a comment submitted by the user
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
app.post('/savegrade', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html

  var gradeby=req.user.username;
  var feedback=req.body.feedback;
  var gradeon=req.body.gradeon;
  var dno=req.body.dno;
  var grade=req.body.grade;
     saveGrade(feedback, dno, gradeon, gradeby,grade, function(err, user){
    if (err) {
      res.render('gradeonanswer', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = req.user.username;

      res.render('gradefinal',{layout:false});

    }
  });


});

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


app.post('/enterdata', function(req, res){
  // The 3 variables below all come from the form
  // in views/signup.hbs
  var statement = req.body.statement;
  var hint = req.body.hint;
  var solution = req.body.solution;
  var modno=req.body.moduleno;


  enterData(modno, statement, hint, solution, function(err, user){
    if (err) {
      res.render('enterdata', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = user.username;

      res.redirect('/enterdata');
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
  app.listen(port, function(){
    console.log('Server is listening on port: '+port);
  });
})
