# bookshelf-secure-password

[![Version](https://img.shields.io/npm/v/bookshelf-secure-password.svg)](https://www.npmjs.com/package/bookshelf-secure-password)
[![Build Status](https://img.shields.io/travis/venables/bookshelf-secure-password/master.svg)](https://travis-ci.org/venables/bookshelf-secure-password)
[![Coverage Status](https://img.shields.io/coveralls/venables/bookshelf-secure-password.svg)](https://coveralls.io/github/venables/bookshelf-secure-password)
[![Dependency Status](https://david-dm.org/venables/bookshelf-secure-password.png)](https://david-dm.org/venables/bookshelf-secure-password)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](http://standardjs.com/)
[![License](https://img.shields.io/npm/l/bookshelf-secure-password.svg)](https://github.com/venables/bookshelf-secure-password/blob/master/LICENSE.txt)
[![Downloads](https://img.shields.io/npm/dm/bookshelf-secure-password.svg)](https://www.npmjs.com/package/bookshelf-secure-password)

A Bookshelf.js plugin for securely handling passwords.

## Features

* Securely store passwords in the database using BCrypt with ease.
* Minimal setup required: just install the module, and make a `password_digest` column in the database!
* Follows the latest security guidelines, using a BCrypt cost of 12
* Inspired by and similar to [has_secure_password](http://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html) in Ruby on Rails.

## Installation

```
yarn add bookshelf-secure-password
```

or

```
npm install bookshelf-secure-password --save
```

## Usage

1. Enable the plugin in your Bookshelf setup

  ```javascript
  const bookshelf = require('bookshelf')(knex)
  const securePassword = require('bookshelf-secure-password')

  bookshelf.plugin(securePassword)
  ```

2. Add `hasSecurePassword` to the model(s) which require a secure password

  ```javascript
  const User = bookshelf.Model.extend({
    tableName: 'users',
    hasSecurePassword: true
  })
  ```

  By default, this will use the database column named `password_digest`. To use a different column, simply change `true` to be the column name. For example:

  ```javascript
  const User = bookshelf.Model.extend({
    tableName: 'users',
    hasSecurePassword: 'custom_password_digest_field'
  })
  ```

3. Now, when you set a password and save the record, it will be hashed as `password_digest`:

  ```javascript
  user = new User({ password: 'testing' })
  user.get('password') // => undefined
  user.get('password_digest') // => undefined

  user.save().then(function () {
    user.get('password') // => undefined
    user.get('password_digest') // => '$2a$12$SzUDit15feMdVCtfSzopc.0LuqeHlJInqq/1Ol8uxCC5QydHpVWFy'
  })
  ```

4. To authenticate against the password, simply call the instance method `authenticate`, which returns a `Promise` resolving to the authenticated Model.

  ```javascript
  user.authenticate('some-password').then(function (user) {
    // do something with the authenticated user
  }, function (err) {
    // invalid password.
    // `err` will be of type `PasswordMismatchError`, which extends the `Error` class
  })
  ```

## Example

```javascript
const User = require('./models/User')

/**
 * Sign up a new user.
 *
 * @returns {Promise.<User>} A promise resolving to the newly registered User, or rejected with an error.
 */
function signUp (email, password) {
  let user = new User({ email: email, password: password })

  return user.save()
}

/**
 * Sign in with a given email, password combination
 *
 * @returns {Promise.<User>} A promise resolving to the authenticated User, or rejected with a `PasswordMismatchError`.
 */
function signIn (email, password) {
  return User.forge({ email: email })
    .fetch()
    .then(function (user) {
      return user.authenticate(password)
    })
}
```

## Notes

* BCrypt requires that passwords are 72 characters maximum (it ignores characters after 72).
* This library enables the built-in `virtuals` plugin on Bookshelf for the virtual `password` field.
* Passing a `null` value to the password will clear the `password_digest`.
* Passing `undefined` or a zero-length string to the password will leave the `password_digest` as-is

## Testing

To run the tests locally, simply run `yarn test` or `npm test`
