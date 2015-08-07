//Declaring raquired modules for node.js
var express = require('express');
var app = express();
var fs=require('fs')
var expressSession = require('express-session');
var expressHbs = require('express3-handlebars');
var mongoUrl = 'mongodb://localhost:27017/peerreview';
var mongo = require('./lib/mongo');
assert = require('assert');
var methods = require('./lib/methods');
var csvParser = require('csv-parse');


var port = 3333; // port number which we are using for node server


// Use this so we can get access to `req.body` in our posted forms.
app.use( require('body-parser')() );

// We need to use cookies for sessions, so use the cookie parser
app.use( require('cookie-parser')() );

app.use( expressSession({secret: 'somesecretrandomstring',}));

// We must use this middleware _after_ the expressSession middleware,
// because checkIfLoggedIn checks the `req.session.username` value,
// which will not be available until after the session middleware runs.
app.use(methods.checkIfLoggedIn);


//set up of view engine
app.engine('html', expressHbs({extname:'html', defaultLayout:'main.html'}));
app.set('view engine', 'html');

//To get home page
app.get('/', function(req, res){
  var coll = mongo.collection('problemschema');
  coll.find({}).toArray(function(err, stmtdata){
    res.render('index.html', {stmtdata:stmtdata});
  })
});

app.get('/moduleproblems', function(req, res){
  var coll = mongo.collection('problemschema');
  coll.find({courseId:req.session.courseId,modulename:req.session.modulename}).toArray(function(err, stmtdata){
    res.render('moduleproblems', {stmtdata:stmtdata});
  })
});
//To get login page
app.get('/login', function(req, res){
  res.render('login');
});
app.get('/pwdsuccess', function(req, res){
  res.render('pwdsuccess');
});
app.get('/studsettings', function(req, res){
  res.render('studsettings');
});
app.get('/uploadproblemsrepeat', function(req, res){
  res.render('uploadproblemsrepeat');
});
app.get('/admin', function(req, res){
  res.render('admin');
});
app.get('/createnewcourse', function(req, res){
  res.render('createnewcourse');
});
app.get('/populatemodule', function(req, res){
  res.render('populatemodule');
});

app.get('/modpop', function(req, res){
  req.session.modulename=req.query.modName;

  res.render('populatemodule');
});
app.get('/modifycourse', function(req, res){
  var course_coll=mongo.collection("courseschema");
  course_coll.find({createdby:req.session.username}).toArray(function(err,courseList){
    res.render('modifycourse',{courses:courseList});
  });

});
app.get('/courseemail', function(req, res){
  res.render('courseemail');
});
app.get('/enrollstudents', function(req, res){
  res.render('enrollstudents');
});
app.get('/uploadstudents', function(req, res){
  res.render('uploadstudents');
});
app.get('/uploadstudentcsv', function(req, res){
  res.render('uploadstudentcsv');
});
app.get('/enrollmanually', function(req, res){
  res.render('enrollmanually');
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
app.get('/secret', methods.requireUser, function(req, res){
  res.render('secret');
});


app.post('/pwdreset',  function(req, res){
  var user_name=req.body.username;
  var user_coll=mongo.collection("users");
  user_coll.findOne({username: user_name}, function(err, document) {
  res.render('pwdreset',{question:document.secquest,username:user_name});
  });
});
//To get signup page
app.get('/signup', function(req,res){
  res.render('signup');
});
app.get('/pwdresetform', function(req,res){
  res.render('pwdresetform');
});
//To get login page
app.get('/success', function(req, res){
  res.render('success',{layout:false});
});


app.get('/selectmodule', function(req, res){
  res.render('selectmodule',{layout:false});
});

app.get('/createmodule', function(req, res){
  res.render('createmodule');
});
app.get('/uploadcsv', function(req, res){
  res.render('uploadcsv');
});
app.get('/uploadprblms', function(req, res){
  res.render('uploadprblms');
});


//To get drafts page
app.post('/drafts', function(req,res){
var coll = mongo.collection('problemschema');
var modulename=req.body.modulename;
  coll.find({modulename:modulename}).toArray(function(err, stmtdata){

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
app.post('/inputdraft', function(req,res){
var coll = mongo.collection('problemschema');
var stmtno=parseInt(req.body.selected);
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
var coll = mongo.collection('moduleschema');
  coll.find({}).toArray(function(err, modules){
    res.render('userscreen', {modules:modules});
});
});



//To get the data from signup form
app.post('/signup', function(req, res){
  // The variables below all come from the form in views/signup.html
   var firstname = req.body.firstname;
    var lastname = req.body.lastname;
  var username = req.body.username;
  var password = req.body.password;
  var password_confirmation = req.body.password_confirmation;
  var email = req.body.email;
  var sec_Quest=req.body.squest;
  var sec_Answer=req.body.answer;
   var userrole = req.body.userrole;

  methods.createUser(firstname, lastname,username, password, password_confirmation, email, sec_Quest, sec_Answer, userrole, function(err, user){
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
/*app.post('/inputdraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
	  req.session.value=req.body.selected;
      res.redirect('/inputdraft');
});*/
app.post('/updatecourse', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;
     var courseId=req.body.selected;
     req.session.courseId=courseId;
     var mod_coll=mongo.collection("moduleschema");

     mod_coll.find({courseId:courseId}).toArray(function(err,modList){
       var course_coll=mongo.collection("courseschema");
       course_coll.findOne({courseId:courseId},function(err,course){

         // This way subsequent requests will know the user is logged in.

         req.session.username = username;

         res.render('updatecourse',{course:course,modules:modList});

       });




     });

});

app.post('/uploadcsv', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
  var username=req.user.username;
  var filePath=req.body.csvfile;
  var newColl=mongo.collection("problemschema");

  fs.readFile(filePath, {
              encoding: 'utf-8'
          }, function(err, csvData) {
              if (err) {
                  console.log(err);
              }

              csvParser(csvData, {
                  delimiter: ','
              }, function(err, data) {
                  if (err) {
                      console.log(err);
                  } else {



                        newColl.count(function(err, count) {
                            assert.equal(null, err);
  		                          ++count;
                                for(var i=0;i<data.length;i++)
                                {
                                  var stmtObject = {
  	                                               sno:count,
                                                  courseId:req.session.courseId,
  	                                              modulename:req.session.modulename,
                                                  problem: data[i][0],
  	                                              hint: data[i][1],
                                                  solution: data[i][2]
                                                };


                                                  // create the new Problem
                                                    newColl.insert(stmtObject, function(err,user){

                                                    });
                                                    count++;
  	                              }

                                });

              }
          });
        });

   // This way subsequent requests will know the user is logged in.
   req.session.username = username;
   res.redirect('/moduleproblems');
});

app.post('/createmodule', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;
     var modulename=req.body.modulename;
     var coll=mongo.collection("moduleschema");
     coll.insert({modulename:modulename,courseId:req.session.courseId,createdby:username}, function(err,user){ });
      // This way subsequent requests will know the user is logged in.
      req.session.username = username;
      req.session.modulename = modulename;
      res.render('modulecreated',{modulename:modulename});
});

app.post('/createcourse', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
     var username=req.user.username;
     var courseName=req.body.coursename;
     var courseNum=req.body.coursenum;
     var courseId=req.body.courseid;
methods.createCourse(courseName,courseNum,courseId,username, function(err, user){
if (err) {
 res.render('createnewcourse', {error: err});
} else {

 // This way subsequent requests will know the user is logged in.
 req.session.username = username;
 req.session.courseId=courseId;
 res.render('coursecreated',{courseName:courseName,courseNum:courseNum,courseId:courseId});

}
});


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
app.post('/resetpwd', function(req, res){

var user_name=req.body.username;
var answer=req.body.answer;
var password=req.body.newpassword;
var question=req.body.question;

var coll=mongo.collection("users");

coll.find({username:user_name,answer:answer}).toArray(function(err,user1){
  if(user1.length>0)
  {
  methods.changepassword(user_name, answer, password, function(err, user){
 if (err) {
   res.render('pwdreset', {error: true,question:question});
 } else {

   res.render('pwdsuccess');

 }
});
}
else {
  {
    res.render('pwdreset', {error: true,question:question});
  }
}
});


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

app.post('/savedraft', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html
  var username=req.user.username;
  var solution=req.body.solution;
  var statement=req.body.statement;
  var pno=req.session.value;
  var finalsolution=req.body.finalsolution;
     methods.saveDraft(username, pno, statement, solution, finalsolution, function(err, user){
    if (err) {
      res.render('inputdraft', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;

      res.render('success',{layout:false});

    }
  });


});

app.post('/savecomment', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html

  var commentby=req.user.username;
  var comment=req.body.comment;
  var commenton=req.body.commenton;
  var dno=req.body.dno;
     methods.saveComment(comment, dno, commenton, commentby, function(err, user){
    if (err) {
      res.render('commentondraft', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = req.user.username;

      res.render('success',{layout:false});

    }
  });


});



app.post('/savegrade', function(req, res){
  // The 3 variables below all come from the form
  // in views/drafts.html

  var gradeby=req.user.username;
  var feedback=req.body.feedback;
  var gradeon=req.body.gradeon;
  var dno=req.body.dno;
  var grade=req.body.grade;
     methods.saveGrade(feedback, dno, gradeon, gradeby,grade, function(err, user){
    if (err) {
      res.render('gradeonanswer', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = req.user.username;

      res.render('success',{layout:false});

    }
  });


});


app.post('/enterdata', function(req, res){
  // The 3 variables below all come from the form
  // in views/signup.hbs
  var username=req.user.username;
  var statement = req.body.statement;
  var hint = req.body.hint;
  var solution = req.body.solution;



  methods.enterData(req.session.courseId,req.session.modulename, statement, hint, solution, function(err, user){
    if (err) {
      res.render('enterdata', {error: err});
    } else {

      // This way subsequent requests will know the user is logged in.
      req.session.username = username;

      res.redirect('/uploadproblemsrepeat');
    }
  });
});

app.post('/login', function(req, res){
  // These two variables come from the form on
  // the views/login.hbs page
  var username = req.body.username;
  var password = req.body.password;

  methods.authenticateUser(username, password, function(err, user){
    if(user)
    {
      if(user.userrole==='admin')
	     {
		// This way subsequent requests will know the user is logged in.
          req.session.username = user.username;

            res.redirect('/admin');
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
