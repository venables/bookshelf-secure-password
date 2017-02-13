module.exports = function (Bookshelf) {
  'use strict'
  const bcrypt = require('bcrypt')
  const DEFAULT_PASSWORD_FIELD = 'password_digest'
  const DEFAULT_SALT_ROUNDS = 12
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype

  Bookshelf.plugin('virtuals')

  /**
   * Get the password field from the plugin configuration.  defaults to `password_digest`
   *
   * @param {Model} model - the Bookshelf model
   * @returns {String} - The database column name for the password digest
   */
  function passwordField (model) {
    if (typeof model.hasSecurePassword === 'string' || model.hasSecurePassword instanceof String) {
      return model.hasSecurePassword
    }

    return DEFAULT_PASSWORD_FIELD
  }

  /**
   * Checks if a string is empty (null, undefined, or length of zero)
   *
   * @param {String} str - A string
   * @returns {Boolean} - Whether or not the string is empty
   */
  function isEmpty (str) {
    if (str === undefined || str === null) {
      return true
    }

    return ('' + str).length === 0
  }

  const Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function () {
      let passwordDigestField

      if (this.hasSecurePassword) {
        passwordDigestField = passwordField(this)

        this.virtuals = this.virtuals || {}
        this.virtuals.password = {
          get: function getPassword () {},
          set: function setPassword (value) {
            if (value === null) {
              this.set(passwordDigestField, null)
            } else if (!isEmpty(value)) {
              let salt = bcrypt.genSaltSync(DEFAULT_SALT_ROUNDS)
              let digest = bcrypt.hashSync(value, salt)
              this.set(passwordDigestField, digest)
            }
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
