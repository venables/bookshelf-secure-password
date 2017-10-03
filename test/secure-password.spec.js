'use strict'

const Bookshelf = require('bookshelf')
const expect = require('chai').expect
const Knex = require('knex')
const mockKnex = require('mock-knex')
const PasswordMismatchError = require('../lib/error')
const securePassword = require('../lib/secure-password.js')

describe('bookshelf-secure-password', function () {
  let bookshelf
  let knex
  let model
  let BasicModel
  let CustomModel
  let RoundsModel

  before(function () {
    knex = new Knex({ client: 'pg' })
    mockKnex.mock(knex)

    bookshelf = new Bookshelf(knex)
    bookshelf.plugin(securePassword)

    BasicModel = bookshelf.Model.extend({
      hasSecurePassword: true
    })

    CustomModel = bookshelf.Model.extend({
      hasSecurePassword: 'custom_column'
    })

    RoundsModel = bookshelf.Model.extend({
      hasSecurePassword: true,
      bcryptRounds: 5
    })
  })

  after(function () {
    mockKnex.unmock(knex)
  })

  describe('password hashing', function () {
    describe('with the default column', function () {
      beforeEach(function () {
        model = new BasicModel({ id: 1, password: 'testing' })
      })

      describe('before save', function () {
        it('does not keep the raw password on the model', function () {
          expect(model.get('password')).to.be.undefined
          expect(model.attributes.password).to.be.undefined

          expect(model.get('password_digest')).to.be.undefined
          expect(model.attributes.password_digest).to.be.undefined
        })
      })

      describe('after save', function () {
        beforeEach(function () {
          return model.save()
        })

        it('sets the password digest field to null if given a `null` value', function () {
          expect(model.get('password_digest')).to.be.a.string
          model.set('password', null)

          return model.save().then(() => {
            expect(model.get('password_digest')).to.be.null
          })
        })

        it('does not change the password digest if given undefined', function () {
          let originalString = model.get('password_digest')
          model.set('password', undefined)

          return model.save().then(() => {
            expect(model.get('password_digest')).to.equal(originalString)
          })
        })

        it('does not change the password digest if given an empty string', function () {
          let originalString = model.get('password_digest')
          model.set('password', '')

          return model.save().then(() => {
            expect(model.get('password_digest')).to.equal(originalString)
          })
        })

        it('changes the password digest if given a blank (spaces-only) string', function () {
          let originalString = model.get('password_digest')
          model.set('password', '  ')
          return model.save().then(() => {
            expect(model.get('password_digest')).to.be.a.string
            expect(model.get('password_digest')).not.to.equal(originalString)
          })
        })
      })

      it('handles the case if a later validation throws an exception', function () {
        let digest

        model.on('saving', function (model) {
          throw new Error()
        })

        return model
          .save()
          .then(() => {
            expect(false).to.be.true
          }, () => {
            expect(model.get('password')).to.be.undefined
            expect(model.get('password_digest')).to.be.a.string
            digest = model.get('password_digest')
            return model.save()
          })
          .then(() => {
            expect(false).to.be.true
          }, () => {
            expect(model.get('password_digest')).to.equal(digest)
          })
      })
    })

    describe('with a custom column', function () {
      before(function () {
        model = new CustomModel({ id: 2, password: 'testing' })
        return model.save()
      })

      it('allows the default column to be overwritten', function () {
        expect(model.get('password')).to.be.undefined
        expect(model.attributes.password).to.be.undefined

        expect(model.get('custom_column')).to.be.a.string
        expect(model.attributes.custom_column).to.be.a.string
      })
    })

    describe('with a bcrypt rounds', function () {
      describe('custom number of rounds', function () {
        before(function () {
          model = new RoundsModel({ id: 3, password: 'testing' })
          return model.save()
        })

        it('uses custom bcrypt rounds', function () {
          expect(model.get('password_digest').substr(4, 2)).to.equal('05')
        })
      })

      describe('default number of rounds', function () {
        before(function () {
          model = new BasicModel({ id: 4, password: 'testing' })
          return model.save()
        })

        it('uses default bcrypt rounds', function () {
          expect(model.get('password_digest').substr(4, 2)).to.equal('12')
        })
      })
    })
  })

  describe('#authenticate', function () {
    describe('with hasSecurePassword enabled on the model', function () {
      beforeEach(function () {
        model = new BasicModel({ id: 1, password: 'testing' })
      })

      describe('before save', function () {
        it('does not authenticate until the record is saved', function () {
          return model.authenticate('testing').then((model) => {
            expect(false).to.be.true
          }, (err) => {
            expect(err).to.be.defined
            expect(err).to.be.an.instanceof(PasswordMismatchError)
            expect(err.name).to.equal('PasswordMismatchError')
          })
        })
      })

      describe('after save', function () {
        beforeEach(function () {
          return model.save()
        })

        it('resolves the Model if the password matches', function () {
          return model.authenticate('testing').then((model) => {
            expect(model).to.be.defined
          }, (err) => {
            expect(err).to.be.undefined
          })
        })

        it('rejects with a PasswordMismatchError if the password does not match', function () {
          return model.authenticate('invalid').then((model) => {
            expect(false).to.be.true
          }, (err) => {
            expect(err).to.be.defined
            expect(err).to.be.an.instanceof(PasswordMismatchError)
            expect(err.name).to.equal('PasswordMismatchError')
          })
        })

        it('rejects with a PasswordMismatchError if the no password is provided', function () {
          return model.authenticate().then((model) => {
            expect(model).to.be.defined
          }, (err) => {
            expect(err).to.be.defined
            expect(err).to.be.an.instanceof(PasswordMismatchError)
            expect(err.name).to.equal('PasswordMismatchError')
          })
        })
      })
    })

    describe('without hasSecurePassword on this model', function () {
      it('calls the model`s `authenticate` method', function () {
        const Model = bookshelf.Model.extend({})
        model = new Model({ id: 1, password: 'testing' })

        try {
          return model.authenticate('testing')
        } catch (err) {
          expect(err).to.be.defined
          expect(err).to.be.an.instanceof(TypeError)
        }
      })
    })
  })
})
