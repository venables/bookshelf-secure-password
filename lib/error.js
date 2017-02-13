'use strict'

class PasswordMismatchError extends Error {
  constructor (message) {
    super(message)
    this.name = 'PasswordMismatchError'
  }
}

module.exports = PasswordMismatchError
