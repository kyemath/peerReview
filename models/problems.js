// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var prblmsSchema = new Schema({
  sno: { type: Number, required: true, unique: true },
  mno: { type: String, required: true },
  courseno: { type: String, required: true },
  statement:{ type: String, required: true },
  hint: String,
  solution: String,

});

// the schema is useless so far
// we need to create a model using it
var prblms = mongoose.model('prblms', prblmsSchema);

// make this available to our users in our Node applications
module.exports = prblms;
