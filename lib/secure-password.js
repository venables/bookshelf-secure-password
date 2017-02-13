'use strict'

function enableSecurePasswordPlugin (Bookshelf) {
  const bcrypt = require('bcrypt')
  const DEFAULT_PASSWORD_FIELD = 'password'
  const DEFAULT_PASSWORD_DIGEST_FIELD = 'password_digest'
  const DEFAULT_SALT_ROUNDS = 12
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype

  Bookshelf.PasswordMismatchError = PasswordMismatchError
  Bookshelf.Model.PasswordMismatchError = PasswordMismatchError
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

    return DEFAULT_PASSWORD_DIGEST_FIELD
  }

  /**
   * Generate the BCrypt hash for a given string
   *
   * @param {String} value - The string to hash
   * @returns {String} - A BCrypt hashed version of the string
   */
  function hash (value) {
    let salt = bcrypt.genSaltSync(DEFAULT_SALT_ROUNDS)

    return bcrypt.hashSync(value, salt)
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
        this.virtuals[DEFAULT_PASSWORD_FIELD] = {
          get: function getPassword () {},
          set: function setPassword (value) {
            if (value === null) {
              this.set(passwordDigestField, null)
            } else if (!isEmpty(value)) {
              this.set(passwordDigestField, hash(value))
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
            throw new this.constructor.PasswordMismatchError()
          }

          return this
        })
        .catch(() => {
          throw new this.constructor.PasswordMismatchError()
        })
    }
  })

  Bookshelf.Model = Model
}

module.exports = enableSecurePasswordPlugin
