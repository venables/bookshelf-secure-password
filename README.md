# bookshelf-secure-password

[![Dependency Status](https://david-dm.org/venables/bookshelf-secure-password.png)](https://david-dm.org/venables/bookshelf-secure-password)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](http://standardjs.com/)


A Bookshelf.js plugin for handling secure passwords.

Adds a method to securely set and authenticate a password.

Similar to [has_secure_password](http://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html) in Ruby on Rails.

## Installation

```
yarn add bookshelf-secure-password
```

or

```
npm install bookshelf-secure-password --save
```

## Usage

1. Initialize the plugin

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

  By default, this requires a field on the table named `password_digest`. To use a different column, simply set `true` to be the column name. For example:

  ```javascript
  const User = bookshelf.Model.extend({
    tableName: 'users',
    hasSecurePassword: 'custom_password_digest_field'
  })
  ```

3. To authenticate against the password, simply call the instance method `authenticate`:

  ```javascript
  user.authenticate('some-password').then(function (user) {
    // do something with the authenticated user
  }, function (err) {
    // invalid password
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
 * @returns {Promise.<User>} A promise resolving to the authenticated User, or rejected with an error.
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

* This library uses the bcrypt synchronous methods when setting a password.  This is to ensure the raw password is never stored on the model (in memory, or otherwise).
* This library enables the built-in `virtuals` plugin on Bookshelf.
