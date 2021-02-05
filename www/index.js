const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PORT = 3002
var moment = require('moment');
var LocalStorage = require('node-localstorage').LocalStorage,
  localStorage = new LocalStorage('./scratch');

/* require("moment/min/locales");
require('moment/locale/fr') */

moment().format();
/* moment.locale('fr');
moment.locale(); */

mongoose.connect('mongodb://localhost:27017/minichat', { useNewUrlParser: true },
  function (err) {
    if (err) {
      throw err
    }
    console.log('Database connected');


    const userTemplate = mongoose.Schema({
      usrname: String,
      picture: String
    })

    let Users = mongoose.model('users', userTemplate);

    const messageTemplate = mongoose.Schema({
      user: String,
      message: String,
      type: String,
      date: String
    })

    let ChatLogs = mongoose.model('chat_logs', messageTemplate);

    // On sert le dossier plublic/
    app.use(express.static('www/pages'));

    // body-parser
    app.use(bodyParser.json());

    // On se sert de socket IO pour emettre / diffuser des événéments
    io.on('connection', (socket) => {

      let login = socket.id;

      // Ici: renvoyer l'historique stocké dans mongo ?
      ChatLogs.find({}).then((chats) => {
        io.emit('getMessages', chats);
      })

      // Sur l'action d'une nouvelle connextion d'un utilisateur
      socket.on('newUser', (username) => {

        // On le rajoute à la liste des utiliseurs
        Users.findOne({ usrname: username }, (err, exists) => {
          if (exists == null) {
            let uid = new mongoose.Types.ObjectId();
            let users = new Users();
            users._id = uid;
            users.usrname = username;
            users.picture = 'https://eu.ui-avatars.com/api/?name=' + username;

            users.save();
            // On prévient tout le monde de son arrivé
            io.emit('newNotification', username + ' vient de nous rejoindre');
            localStorage.setItem('pseudo', username)
            localStorage.setItem('id', uid)
          }
          else {
            let msg = 'Le nom d\'utilisateur ' + username + ' est déjà pris';
            io.emit('alertUser', username, msg);
          }
        })

      })

      socket.on('userExists', (username) => {

        // On prévient tout le monde de son arrivé
        io.emit('newNotification', username + ' vient de se connecter');

        // On demande à tous le monde mettre à jour la liste des utilisateurs
        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })
      })

      // Sur l'action d'un nouveau message reçu
      socket.on('updateUser', (username, nick, pic) => {

        let userid = localStorage.getItem('id')

        // On le rajoute à la liste des utiliseurs
        Users.findOne({ _id: { $ne: userid }, usrname: username }, (err, exists) => {
          if (exists == null) {
            Users.findByIdAndUpdate({ _id: userid }, { usrname: nick, picture: pic }, (err, success) => {
              if (err) {
                console.log('Erreur lors de la màj');
              }
              else {
                io.emit('newNotification', username + ' à changé de pseudo, à ' + nick);
                localStorage.removeItem('pseudo');
                localStorage.setItem('pseudo', nick)
              }
            })
          }
          else {
            let msg = 'Le nom d\'utilisateur ' + username + ' est déjà pris';
            io.emit('alertUser', username, msg);
          }
        })

        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })

        // On diffuse le message à tout le monde
        io.emit('updateUser', username, nick, pic);
      });

      // Sur l'action d'un nouveau message reçu
      socket.on('newMessage', (username, msg, date) => {

        let chatid = new mongoose.Types.ObjectId()

        let chat = new ChatLogs();

        // Ici: stocker dans mongo ?
        chat._id = chatid;
        chat.user = username;
        chat.message = msg;
        chat.date = date;

        chat.save();

        // On diffuse le message à tout le monde
        io.emit('newMessage', username, msg, date);
      });


      // Sur l'action d'une déconnextion d'un utilisateur
      socket.on('disconnect', (username) => {

        // On cherche le user dans la liste pour le retirer
        io.emit('newNotification', username + ' nous a quitté');

        let users = new Users();
        users.deleteOne({ usrname: username });
        //localStorage.removeItem('pseudo');

        // On demande à tous le monde mettre à jour la liste des utilisateurs
        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })
      });
    });

  });

http.listen(PORT, () => {
  console.log('listening on http://localhost:' + PORT);
});