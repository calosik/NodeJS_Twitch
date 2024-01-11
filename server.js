require('dotenv').config();
const axios = require('axios');
const express = require('express');
const passport = require('passport');
const TwitchStrategy = require('passport-twitch-new').Strategy;
const session = require('express-session');

const app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
	  maxAge: 60000 * 60 * 24,
      secure: true,
      httpOnly: true	  
	  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new TwitchStrategy({
  clientID: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: "user_read"
}, function(accessToken, refreshToken, profile, done) {
  profile.accessToken = accessToken;
  console.log("Access Token:", accessToken);
  console.log("Refresh Token:", refreshToken);
  console.log("Profile:", profile);
  return done(null, profile);
}));


passport.serializeUser(function(user, done) {
  console.log("Serializing user:", user); 
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("Deserializing user:", obj);
  done(null, obj);
});

app.get('/', function(req, res) {
  console.log("GET /"); 
  res.render('index', { user: req.user });
});

app.get('/login', passport.authenticate('twitch'));
app.get('/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/' }), function(req, res) {
  req.session.twitchAccessToken = req.user.accessToken;
  console.log('Twitch Access Token:', req.session.twitchAccessToken);
  req.session.broadcasterId = req.user.id;
  res.render('update');
});

app.post('/update', function(req, res) {
  console.log("POST /update");
  const twitchAccessToken = req.session.twitchAccessToken;
  const broadcasterId = '**';

  if (!req.session) {
    console.log('Сессия устарела');
    res.status(403).send('Сессия устарела');
    return;
  }

  if (!twitchAccessToken || !broadcasterId) {
    console.log('Not authenticated with Twitch');
    res.status(403).send('Not authenticated with Twitch');
    return;
  }

  const title = req.body.title;
  const game = req.body.game; 

  axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
    title: title,
    game_id: game // Используйте game_id вместо game
  }, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${twitchAccessToken}` // Используйте токен доступа здесь
    }
  })
  .then(response => {
    console.log('Title and game updated');
    console.log(response);
    res.send('Title and game updated');
  })
  .catch(error => {
    console.error('Error:', error.response.data);
    res.status(500).send('Something went wrong');
  });
});
const port = process.env.PORT || 9100;
app.listen(port, function() {
  console.log(`Server is running on port ${port}`);
});
