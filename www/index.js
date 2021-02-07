const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PORT = 3090
var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch');

let userData = [];

mongoose.connect('mongodb://localhost:27017/minichat', { useNewUrlParser: true },
function (err) {
  if (err) {
    throw err
  }
  console.log('Database connected');
  
  
  const userTemplate = mongoose.Schema(
    {
      usrname: String,
      picture: String,
      remember: Boolean
    }
    )
    
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
            users.remember = false;

            users.save();
            // On prévient tout le monde de son arrivé
            io.emit('newNotification', username + ' vient de nous rejoindre');
            socket.emit('saveDataToLocal', username, uid);
            localStorage.setItem(username+'_user', username)
            localStorage.setItem(username+'_id', uid)
          }
          else {
            let msg = 'Le nom d\'utilisateur ' + username + ' est déjà pris';
            socket.emit('alertUser', msg);
            socket.emit('reloadPage');
          }
        })

      })


      socket.on('userExists', (userid, username) => {

        userid = localStorage.getItem(username+'_id')

        userData = []
        userData.push({_id: userid})

        console.log('SOCKET : userExists')
        console.log(userid)
        console.log(username)
        
        // On prévient tout le monde de son arrivé
        io.emit('newNotification', username + ' vient de se connecter');
        
        // On demande à tous le monde mettre à jour la liste des utilisateurs
        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })

        // Mettre a jour les données dans le formulaire
        Users.find({ _id: userid }).then((userSettings) => {
          let uid = userid
          socket.emit('saveDataToLocal', username, uid);
          socket.emit('updateSettingsData', userSettings);
        })
      })


    
      // Sur la modification du nom/image de l'utilisateur
      socket.on('updateUser', (userid, username, nick, pic, remember) => {

        console.log('SOCKET : updateUser')
        console.log(userid)
        console.log(username)

        // On verifie que le nom n'est pas pris
        Users.findOne({ _id: { $ne: userid }, usrname: username }, (err, exists) => {
          if (exists == null) {
            Users.findByIdAndUpdate({ _id: userid }, { usrname: nick, picture: pic, remember: remember }, (err, success) => {
              if (err) {
                console.log('Erreur lors de la màj');
              }
              if (success) {
                io.emit('newNotification', username + ' à changé de pseudo, à ' + nick);
                let uid = userid;
                localStorage.removeItem(username+'_user')
                localStorage.removeItem(username+'_id')
                socket.emit('eraseDataFromLocal');
                username = nick;
                localStorage.setItem(nick+'_user', nick)
                localStorage.setItem(nick+'_id', userid)
                socket.emit('saveDataToLocal', username, uid);
              }
            })
          }
          else {
            let msg = 'Le nom d\'utilisateur ' + username + ' est déjà pris';
            socket.emit('alertUser', msg);
          }
        })

        // On demande à tous le monde mettre à jour la liste des utilisateurs
        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })
  

        // Mettre a jour les données dans le formulaire
        Users.find({ _id: userid }).then((userSettings) => {
          let uid = userid
          socket.emit('saveDataToLocal', username, uid);
          socket.emit('updateSettingsData', userSettings);
        })

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
      socket.on('disconnect', (userid) => {

        userid = userData[0]._id;
        
        // On cherche le user dans la liste pour le retirer
        Users.findOne({ _id: userid }).then((goneUser) => {

          console.log('SOCKET : disconnect')
          console.log(userid)
          console.log(goneUser.usrname)

          if(goneUser.remember === false){

              io.emit('newNotification', goneUser.usrname + ' nous a quitté');
              goneUser.remove({}).exec();
              socket.emit('eraseDataFromLocal');
              localStorage.removeItem(goneUser.usrname+'_user')
              localStorage.removeItem(goneUser.usrname+'_id')
              userData = []
            }
            if(goneUser.remember === true){
              io.emit('newNotification', goneUser.usrname + ' nous a quitté');
            }

        }).catch((err) => {
          console.log('erreur : ' + err)
        })
      })

        
        // On demande à tous le monde mettre à jour la liste des utilisateurs
        Users.find({}).then((userl) => {
          io.emit('updateUsersList', userl);
        })
      });
    });

http.listen(PORT, () => {
  console.log('listening on http://localhost:' + PORT);
});