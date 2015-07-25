# bookshelf-secure-password

A Bookshelf.js plugin for handling secure passwords.

Adds a method to set and authenticate against a BCrypt password.

Similar to [has_secure_password](http://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html) in Ruby on Rails.

## Installation

```
npm install bookshelf-secure-password --save
```

## Usage

1. Initialize the plugin

  ```javascript
  ...
  var bookshelf = require('bookshelf')(knex);
  var securePassword = require('bookshelf-secure-password');

  bookshelf.plugin(securePassword);
  ```

2. Add `hasSecurePassword` to the model(s) which require a secure password

  ```javascript
  var User = bookshelf.Model.extend({
    tableName: 'users',
    hasSecurePassword: true
  });
  ```

  By default, this requires a field on the table named `password_digest`. To use a different column, simply set `true` to be the column name. For example:

  ```javascript
  var User = bookshelf.Model.extend({
    tableName: 'users',
    hasSecurePassword: 'custom_password_digest_field'
  });
  ```

3. To authenticate against the password, simply call the instance method `authenticate`:

  ```javascript
  var authenticated = user.authenticate('some-password');
  ```


## Notes

* This library uses the sync methods for bcrypt.  This is to ensure the raw password is never stored on the model.
