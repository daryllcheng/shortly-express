var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  // hasTimestamps = true,

  verifyPassword: function(pass){
    var hash = this.get('password')
    return bcrypt.compareSync(pass, hash);
  },

  initialize: function(){
    this.on('creating', function(model, attrs, options) {
      // console.log('is there username1', model.get('username'))
      this.set('password', bcrypt.hashSync(this.get('password')) );

    });

  }
});

module.exports = User;