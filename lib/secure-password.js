module.exports = function (Bookshelf) {
  'use strict'
  const bcrypt = require('bcrypt')
  const DEFAULT_PASSWORD_FIELD = 'password_digest'
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype

  Bookshelf.plugin('virtuals')

  function passwordField (model) {
    if (typeof model.hasSecurePassword === 'string' || model.hasSecurePassword instanceof String) {
      return model.hasSecurePassword
    }

    return DEFAULT_PASSWORD_FIELD
  }

  var Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function () {
      let passwordDigestField

      if (this.hasSecurePassword) {
        passwordDigestField = passwordField(this)

        this.virtuals = this.virtuals || {}
        this.virtuals.password = {
          get: function () {},
          set: function (value) {
            let salt = bcrypt.genSaltSync(10)
            let passwordDigest = bcrypt.hashSync(value, salt)
            this.set(passwordDigestField, passwordDigest)
          }
        }
      }

      proto.constructor.apply(this, arguments)
    },

    /**
     * Authenticate a model's password, returning a Promise which resolves to the model (`this`) if
     * the password matches, and rejects with a `PasswordMismatchError` if the it does not match.
     *
     * @param {String} password - The password to check
     * @returns {Promise.<Model>} A promise resolving to `this` model on success, or rejects with
     * a `PasswordMismatchError` upon failed check.
     */
    authenticate: function authenticate (password) {
      if (!this.hasSecurePassword) {
        return proto.authenticate.apply(this, arguments)
      }

      return bcrypt
        .compare(password, this.get(passwordField(this)))
        .then((matches) => {
          if (!matches) {
            throw new PasswordMismatchError()
          }

          return this
        })
        .catch(() => {
          throw new PasswordMismatchError()
        })
    }
  })

  Bookshelf.Model = Model
}