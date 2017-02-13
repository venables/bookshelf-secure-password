'use strict'

function enableSecurePasswordPlugin (Bookshelf, opts) {
  const bcrypt = require('bcrypt')
  const DEFAULT_PASSWORD_FIELD = 'password'
  const DEFAULT_PASSWORD_DIGEST_FIELD = 'password_digest'
  const DEFAULT_SALT_ROUNDS = 12
  const PasswordMismatchError = require('./error')
  const proto = Bookshelf.Model.prototype
  const useAsync = opts && opts.performOnSave

  Bookshelf.PasswordMismatchError = PasswordMismatchError
  Bookshelf.Model.PasswordMismatchError = PasswordMismatchError

  /**
   * Enable the `virtuals` plugin if we are using the synchronous method of handling
   * password hashing
   */
  if (!useAsync) {
    Bookshelf.plugin('virtuals')
  }

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
   * Generate the BCrypt hash for a given string using synchronous methods
   *
   * @param {String} value - The string to hash
   * @returns {String} - A BCrypt hashed version of the string
   */
  function hashSync (value) {
    let salt = bcrypt.genSaltSync(DEFAULT_SALT_ROUNDS)

    return bcrypt.hashSync(value, salt)
  }

  /**
   * Generate the BCrypt hash for a given string using asynchronous methods
   *
   * @param {String} value - The string to hash
   * @returns {String} - A BCrypt hashed version of the string
   */
  function hashAsync (value) {
    return bcrypt
      .genSalt(DEFAULT_SALT_ROUNDS)
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
   * Enable sychronous (set-time) password hasing on the model when the attribute is set. This
   * method is considered more secure than the asynchronous method because the raw password is
   * not stored in memory on the model, decreasing the liklihood of inadvertently exposing the
   * password.
   *
   * However, this method is blocking and could prevent the web server from handling other requests
   * while hasing the password.
   *
   * @param {Model} model - The bookshelf model to set up
   * @returns {Model} - The model
   */
  function enableSyncHashing (model) {
    let field = passwordDigestField(model)

    model.virtuals = model.virtuals || {}
    model.virtuals[DEFAULT_PASSWORD_FIELD] = {
      get: function getPassword () {},
      set: function setPassword (value) {
        if (value === null) {
          model.set(field, null)
        } else if (!isEmpty(value)) {
          model.set(field, hashSync(value))
        }
      }
    }

    return model
  }

  /**
   * Enable asychronous (save-time) password hasing on the model when the model is saved. This
   * method is beneficial because it makes all expensive calls using asynchronous calls, freeing
   * up additional resources to handle income requests.
   *
   * However, use this with caution. The raw `password` variable will be stored on the model until
   * the record is saved, which increases the chance of inadvertantly exposing it.
   *
   * @param {Model} model - The bookshelf model to set up
   * @returns {Model} - The model
   */
  function enableAsyncHashing (model) {
    let field = passwordDigestField(model)

    model.on('saving', (model) => {
      if (model.hasChanged(DEFAULT_PASSWORD_FIELD)) {
        let value = model.get(DEFAULT_PASSWORD_FIELD)

        return hashAsync(value).then((_hashed) => {
          model.unset(DEFAULT_PASSWORD_FIELD)
          model.set(field, _hashed)
          return model
        })
      }
    })
  }

  const Model = Bookshelf.Model.extend({
    hasSecurePassword: false,

    constructor: function () {
      if (this.hasSecurePassword) {
        if (useAsync) {
          enableAsyncHashing(this)
        } else {
          enableSyncHashing(this)
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

      if (isEmpty(password)) {
        return Promise.reject(new this.constructor.PasswordMismatchError())
      }

      return bcrypt
        .compare(password, this.get(passwordDigestField(this)))
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
