
//Declaring raquired modules for node.js
var mongoUrl = 'mongodb://localhost:27017/peerreview';
var mongo = require('./mongo');
mongo.connect(mongoUrl, function(){
  console.log('Connected to mongo at: ' + mongoUrl);
  });

var self= {
// to check whether the user is looged in or not while giving access to confidential pages
requireUser:function (req, res, next){
  if (!req.user) {
    res.redirect('/not_allowed');
  } else {
    next();
  }
},

// This middleware checks if the user is logged in and sets req.user and res.locals.user appropriately if so.
 checkIfLoggedIn:function(req, res, next){
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
},

//function to create password salt
createSalt:function(){
  var crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
},

//Function to create password hash
createHash:function(string){
  var crypto = require('crypto');
  return crypto.createHash('sha256').update(string).digest('hex');
},

//Function to created a new user
createUser:function(firstname, lastname, username, password, password_confirmation, email, sec_Quest, sec_Answer, userrole, callback){
  var coll = mongo.collection('users');

  if (password !== password_confirmation) {
    var err = 'The passwords do not match';
    callback(err);
  } else {
    var query      = {username:username};
    var salt       = self.createSalt();
    var hashedPassword = self.createHash(password + salt);
    var userObject = {
	  firstname: firstname,
	  lastname: lastname,
      username: username,
	  email: email,
	  userrole: userrole,
    secquest:sec_Quest,
    answer:sec_Answer,
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
},

enrollUsers:function(name,courseId, callback){
  var coll = mongo.collection('users');
var newColl=mongo.collection("enrollmentschema");

    coll.findOne({username:name}, function(err, user){


      if (user) {

        var courseObject = {
                     courseId:courseId,
                    username:name
                  };


                      newColl.insert(courseObject, function(err,user){

                      });


      } else {
        err = 'The username you entered is invalid';
        callback(err);
      }
    });
},

//function to save a draft submitted by the user
saveDraft:function(username, pno, problem, solution, finalsolution, callback){

  var coll = mongo.collection('dfansdata');
  var del_save_coll = mongo.collection('tempsaveddata');

coll.find({username:username,pno:pno}).toArray(function(err,draftdata){
  if(draftdata.length!=1)
  {
    coll.findOne({$query:{},$orderby:{dno:-1}},function(err, lastrecord) {
      if(lastrecord==null)
        var recdno=1;
      else
        var recdno=lastrecord.dno;
		var draftObject = {
	  dno:parseInt(recdno)+1,
      username: username,
	  pno: pno,
	  problem:problem,
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
  del_save_coll.remove({username:username,pno:pno},function(err,user){
    callback(err,user);
  });
},

changepassword:function(username, answer, password, callback){

  var coll=mongo.collection("users");
  var salt       = self.createSalt();
  var hashedPassword = self.createHash(password + salt);

  coll.update({username:username},{$set:{salt:salt,hashedPassword:hashedPassword}},function(err,user){
    callback(err,user);
  });
},
//function to save a comment submitted by the user
saveComment:function(comment, dno, commenton, commentby, callback){

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
},
saveGrade:function(feedback, dno, gradeon, gradeby, grade,courseId, callback){

  var coll = mongo.collection('gradedata');


		var gradeObject = {
	  grade:parseInt(grade),
    feedback:feedback,
      dno: dno,
	  gradeon: gradeon,
	  gradeby:gradeby,
    courseId:courseId
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
},
//Function to input problems
enterData:function(courseId,modulename,problem, hint, solution, callback){
  var coll = mongo.collection('problemschema');
  coll.findOne({$query:{},$orderby:{sno:-1}},function(err, lastrecord) {
      if(lastrecord==null)
        var recsno=1;
      else
        var recsno=lastrecord.sno;

    var stmtObject = {
                     sno:parseInt(recsno)+1,
                    courseId:courseId,
                    modulename:modulename,
                    problem: problem,
	                    hint: hint,
                      solution: solution
                    };


        // create the new Problem
        coll.insert(stmtObject, function(err,user){
          callback(err,user);
        });
	});
},



// This finds a user matching the username and password that were given.
authenticateUser:function(username, password, callback){
  var coll = mongo.collection('users');

  coll.findOne({username: username}, function(err, user){
    if (err) {
      return callback(err, null);
    }
    if (!user) {
      return callback(null, null);
    }
    var salt = user.salt;
    var hash = self.createHash(password + salt);
    if (hash === user.hashedPassword) {
      return callback(null, user);
    } else {
      return callback(null, null);
    }
  });
},

createCourse:function(courseName, courseNum, courseId,username, callback){
  var coll = mongo.collection('courseschema');

    var query      = {courseId:courseId};

    var courseObject = {
	  courseId: courseId,
	  courseName: courseName,
      courseNum: courseNum,
    createdby:username
	      };



    // make sure this course ID does not exist already
    coll.findOne(query, function(err, doc){
      if (doc) {
        err = 'The courseId you entered already exists';
        callback(err);
      } else {
        // create the new course
        coll.insert(courseObject, function(err,user){
          callback(err,user);
        });
      }
    });
  },

  setAvg:function(dno, username, callback){
    var coll = mongo.collection('gradedata');
    var d_coll=mongo.collection('dfansdata');
    var avg=0;
    var ravg=0.0;
    coll.find({dno:""+dno,gradeon:username}).toArray(function(err,gradedata){

      for(var m=0;m<gradedata.length;m++)
        {
            avg+=gradedata[m]["grade"];
        }
        ravg=avg/3;

        d_coll.update({dno:dno},{$set:{fgrade:ravg}}, function(err, object) {
      																					if (err){
      																								console.warn(err.message);  // returns error if no matching object found
      																							}else{

                                                          
      																									}
        });

        callback(null,ravg);
      });
      }



}
module.exports=self;
