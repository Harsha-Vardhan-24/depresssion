require("dotenv").config();
const express = require("express")
const ejs = require("ejs")
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption")
// // const md5 = require("md5");

// const bcrypt = require("bcryptjs");
// const saltRounds = bcrypt.genSaltSync(10);
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const PORT = process.env.PORT || 3000

const app = express()

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true})); 
app.use(express.json()); 
app.use(express.static('public'));

app.use(session({
    secret: "This is a secret",
    resave: false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());
let specificUserId

mongoose.connect("mongodb+srv://admin:nhhwnXnZXvETsfDQ@depression.wybqu.mongodb.net/depressionDB")
//mongoose.connect("mongodb+srv://admin:qCaDPRSXIyBW3qyu@secrets.fbgvy.mongodb.net/secretsDB");


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    specificUserId = user._id
    done(null, user._id);
});
   
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://depression-hv.herokuapp.com/auth/google"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] 
}));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res){
    res.render("login");
});


app.get("/register", function(req, res){
    res.render("register");
});

app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
})


app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets: foundUsers})
            }
        }
    });
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    })
})

app.get("/submit", function(req, res){
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    User.findById(specificUserId, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret
                foundUser.save(function(){
                    
            res.redirect("/secrets")
                });
            }
        }
    });
});


app.listen(PORT, function () { 
    console.log("Success");
 })