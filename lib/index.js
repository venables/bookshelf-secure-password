module.exports = function (Bookshelf) {
  'use strict'
  const bcrypt = require('bcrypt')
  const DEFAULT_PASSWORD_FIELD = 'password_digest'
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype

  Bookshelf.plugin('virtuals')

  function passwordField (model) {
    if (typeof this.hasSecurePassword === 'string' || this.hasSecurePassword instanceof String) {
      return this.hasSecurePassword
    }

    return DEFAULT_PASSWORD_FIELD
  }

  var Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function () {
      let passwordDigestField = passwordField(this)

      if (this.hasSecurePassword) {
        this.virtuals = this.virtuals || {}
        this.virtuals.password = {
          get: function () {},
          set: function (value) {
            var salt = bcrypt.genSaltSync(10)
            this.set(passwordDigestField, bcrypt.hashSync(value, salt))
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
    authenticate: function (password) {
      if (!this.hasSecurePassword) {
        return Promise.reject(PasswordMismatchError())
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
