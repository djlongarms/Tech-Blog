require('dotenv').config()

const express = require('express')
const { join } = require('path')
const passport = require('passport')
const { User, Item } = require('./models')
const { Strategy: JWTStrategy, ExtractJwt } = require('passport-jwt')
const { Strategy: FacebookStrategy } = require('passport-facebook')
const app = express()

app.use(express.static(join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(passport.initialize())
app.use(passport.session())

passport.use(User.createStrategy())
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findOne({ id })
    .then(user => done(null, user))
    .catch(err => done(err, null))
})

passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET
}, ({ id }, cb) => User.findOne({ where: { id }, include: [Item] })
  .then(user => cb(null, user))
  .catch(err => cb(err))))

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: 'https://pure-brook-01782.herokuapp.com/api/users/facebook/callback'
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      where: {
        facebookId: profile.id,
        name: profile.displayName,
        username: '',
        email: '',
        hash: '',
        salt: ''
      }
    })
      .then(res => {
        cb(null, res[0])
      })
      .catch(err => cb(err, null))
  }
))

app.use(require('./routes'))

require('./db').sync()
  .then(() => app.listen(process.env.PORT || 3000))
  .catch(err => console.log(err))