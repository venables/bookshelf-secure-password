'use strict'

function enableSecurePasswordPlugin (Bookshelf) {
  const DEFAULT_PASSWORD_FIELD = 'password'
  const PRIVATE_PASSWORD_FIELD = '__password'
  const DEFAULT_PASSWORD_DIGEST_FIELD = 'password_digest'
  const DEFAULT_SALT_ROUNDS = 12
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype
  let bcrypt
  try {
    bcrypt = require('bcrypt')
  } catch (e) {}

  Bookshelf.PasswordMismatchError = PasswordMismatchError
  Bookshelf.Model.PasswordMismatchError = PasswordMismatchError

  /**
   * Enable the `virtuals` plugin to prevent `password` from leaking
   */
  Bookshelf.plugin('virtuals')

  /**
   * Get the password field from the plugin configuration.  defaults to `password_digest`
   *
   * @param {Model} model - the Bookshelf model
   * @returns {String} - The database column name for the password digest
   */
  function passwordDigestField (model) {
    if (typeof model.hasSecurePassword === 'string' || model.hasSecurePassword instanceof String) {
      return model.hasSecurePassword
    }

    return DEFAULT_PASSWORD_DIGEST_FIELD
  }

  /**
   * Get the number of bcrypt salt rounds from the model.  defaults to `DEFAULT_SALT_ROUNDS`
   *
   * @param {Model} model - the Bookshelf model
   * @returns {Number} - The number of bcrypt salt rounds
   */
  function bcryptRounds (model) {
    if (typeof model.bcryptRounds === 'number' && model.bcryptRounds === parseInt(model.bcryptRounds, 10)) {
      return model.bcryptRounds
    }

    return DEFAULT_SALT_ROUNDS
  }

  /**
   * Generate the BCrypt hash for a given string.
   *
   * @param {Number} rounds - The number of bcrypt salt rounds
   * @param {String} value - The string to hash
   * @returns {Promise.<String>} - A BCrypt hashed version of the string
   */
  function hash (rounds, value) {
    if (value === null) {
      return Promise.resolve(null)
    }

    if (isEmpty(value)) {
      return Promise.resolve(undefined)
    }

    return bcrypt
      .genSalt(rounds)
      .then((salt) => {
        return bcrypt.hash(value, salt)
      })
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

  /**
   * Enable password hasing on the model when the model is saved.
   *
   * @param {Model} model - The bookshelf model to set up
   * @returns {Model} - The model
   */
  function enablePasswordHashing (model) {
    let field = passwordDigestField(model)

    model.virtuals = model.virtuals || {}
    model.virtuals[DEFAULT_PASSWORD_FIELD] = {
      get: function getPassword () {},
      set: function setPassword (value) {
        this[PRIVATE_PASSWORD_FIELD] = value
      }
    }

    model.on('saving', (model) => {
      let value = model[PRIVATE_PASSWORD_FIELD]

      return hash(bcryptRounds(model), value).then((_hashed) => {
        model.unset(DEFAULT_PASSWORD_FIELD)
        if (_hashed !== undefined) {
          model.set(field, _hashed)
        }
        return model
      })
    })
  }

  const Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function () {
      if (this.hasSecurePassword) {
        enablePasswordHashing(this)
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
      let digest = this.get(passwordDigestField(this))

      if (!this.hasSecurePassword) {
        return proto.authenticate.apply(this, arguments)
      }

      if (isEmpty(password) || isEmpty(digest)) {
        return Promise.reject(new this.constructor.PasswordMismatchError())
      }

      return bcrypt
        .compare(password, digest)
        .then((matches) => {
          if (!matches) {
            throw new this.constructor.PasswordMismatchError()
          }

          return this
        })
    }
  })

  Bookshelf.Model = Model
}

module.exports = enableSecurePasswordPlugin
