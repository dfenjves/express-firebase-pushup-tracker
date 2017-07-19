"use strict"

//Import the correct libraries
const express = require("express")
const logger = require("morgan")
const bodyParser = require("body-parser")
const partials = require("express-partials")
var firebase = require('firebase')
var _ = require('lodash')

 var config = {
    apiKey: "AIzaSyBc2JbNgKEN78nwrnJm8POnf-d6swGnSb8",
    authDomain: "pushups-9932b.firebaseapp.com",
    databaseURL: "https://pushups-9932b.firebaseio.com",
    projectId: "pushups-9932b",
    storageBucket: "",
    messagingSenderId: "995277400193"
  };
  
    var fb = firebase.initializeApp(config);
    var database = fb.database()
    var auth = fb.auth()
    var app = express()

app.set('view engine', 'ejs')

app.use(express.static('views'))

app.set('views', __dirname + "/views")

app.use(partials());

app.use(logger('dev')) //Use a logger to print requests and responses

// Gives the server access to the response, allows it to parse it
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

//Middleware function to protect routes
function isAuthenticated(request, response, next){
    var user = auth.currentUser
    console.log(user.uid)
    
    if (user !== null) {
        request.user = user
        next()
    } else {
        response.render('login.ejs', {
            error: 'Please login to access this page.'
        })
    }
}


//Get and Post requests
app.get("/", function(request, response){
    response.render('index.ejs')
})

app.get('/signup', function(req, res) {
    res.render('signup.ejs', {
        error: null
    })
})

app.get('/login', isAuthenticated, function(req, res) {
    res.render('login.ejs', {
        error: null
    })
})

app.post('/login', function(req, res) {
    var email = req.body.email
    var password = req.body.password
    
    auth.signInWithEmailAndPassword(email, password)
        .then( function(data) {
            console.log(data) 
            res.render('submit.ejs', {
                email: data.email,
            })
        })
        .catch( function(error){ 
            console.log(error) 
            res.render('login.ejs', {
                error: 'Invalid email or password. Please try again.'
            })
        } )
})

app.post('/signup', function(req, res) {
    var email = req.body.email
    var password = req.body.password
    var confirmPassword = req.body.confirmPassword
    
    if (password !== confirmPassword) {
        res.render('signup.ejs', {
            error: 'Passwords did not match! Try again.'
        })
    } else {
        auth.createUserWithEmailAndPassword(email, password)
        .then( function(data) {
            console.log(data) 
            res.render('submit.ejs', {
                email: data.email
            })
        })
        .catch( function(error){ console.log(error) } )
    }
})

app.get('/signout', function(request, response){
    auth.signOut()
    response.render('login.ejs', {
        error: null
    })
})

app.get("/submit", isAuthenticated, (request, response) => {
    response.render('submit.ejs')
})

app.post("/",isAuthenticated, function(request, response){
    console.log("hello")
    const name = request.body.username
    const pushups = request.body.pushups
    var user = request.user
    
    database.ref("/users/" + user.uid + "/email")
            .set( user.email )    
            
    database.ref("/users")
            .child(user.uid)
            .child("pushupList")
            .push({pushups: pushups, time: Date.now().toString()})
    
    response.redirect('/profile')  
})

app.get('/profile', isAuthenticated, (req, res)=>{
    var user = req.user
    database.ref('/users')
            .child(user.uid)
            .once('value')
            .then((snapshot)=>{
                var data = snapshot.val()
                var email = data.email
                var pushupKeys = Object.keys(data.pushupList)
                var pushupsArray = pushupKeys.map(function(key){
                    return data.pushupList[key].pushups
                })
                var totalPushups = 0
                pushupsArray.forEach(function(p){
                    totalPushups += Number(p)
                })
                database.ref("/users/" + user.uid + "/totalPushups")
                        .set(totalPushups)
                res.render('profile.ejs', {email: email, pushups: totalPushups})
            }).catch(err => console.log(err))
})

app.get('/leaderboard', isAuthenticated, (req, res) => {
    database.ref('/users').once('value', (snapshot) => {
        
        res.render('leaderboard.ejs')
    })
})


var port = process.env.PORT || 8080

app.listen(port, function(){
    console.log("app running at port " + port)
})

// Build simple form that takes a name and number, adds to list 