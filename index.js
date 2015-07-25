module.exports = function(Bookshelf) {
  'use strict';
  var _ = require('lodash');
  var bcrypt = require('bcrypt');
  var defaultPasswordField = 'password_digest';
  var proto = Bookshelf.Model.prototype;

  Bookshelf.plugin('virtuals');

  var Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function() {
      var passwordDigestField = _.isString(this.hasSecurePassword) ? this.hasSecurePassword : defaultPasswordField;

      if (this.hasSecurePassword) {
        this.virtuals = _.extend({}, this.virtuals, {
          password: {
            get: function() {},
            set: function(value) {
              var salt = bcrypt.genSaltSync(10);
              this.set(passwordDigestField, bcrypt.hashSync(value, salt));
            }
          }
        });

        proto.constructor.apply(this, arguments);
      }
    },

    authenticate: function(password) {
      var passwordDigestField = _.isString(this.hasSecurePassword) ? this.hasSecurePassword : defaultPasswordField;

      if (this.hasSecurePassword) {
        return bcrypt.compareSync(password, this.get(passwordDigestField));
      }

      return false;
    }
  });

  Bookshelf.Model = Model;
};
