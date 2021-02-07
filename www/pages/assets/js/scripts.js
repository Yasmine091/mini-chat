
import("../../fr.js");

moment().format();
moment.locale();

const socket = io()

let username = localStorage.getItem('pseudo');
let userid = localStorage.getItem('id');
let uid = userid;
const messages = document.getElementById('messages')
const form = document.getElementById('form')
const input = document.getElementById('input')
const sett_btn = document.getElementById('settings-btn')
const settings = document.getElementById('settings-form')
const user_pic = document.getElementById('user_pic')
const user_nick = document.getElementById('user_nick')
const remember_me = document.getElementById('remember_me')
const onlineUsers = document.getElementById('users');
const menu_btn = document.getElementById('menu');

// Demande du pseudo utilisateur (si pas dans le localstorage)
while (!username) {
    username = prompt('Quel est votre pseudo')
    socket.emit('newUser', username)
    remember_me.checked = false;
}

socket.emit('userExists', userid, username)

socket.on('getMessages', function (chats) {
    // Mettre à jour les messages dans le DOM (document) => Page html

    messages.innerHTML = '';

    chats.forEach(msg => {
        var item = document.createElement('li')
        var nick = document.createElement('B')
        var text = document.createElement('span')
        var time = document.createElement('I')
        nick.innerHTML = msg.user + ' : ';
        text.innerHTML = msg.message;
        time.innerHTML = ' ~ ' + moment(msg.date).startOf('second').fromNow();
        item.appendChild(nick);
        item.appendChild(text);
        item.appendChild(time);
        messages.appendChild(item)
        messages.scrollTop = messages.scrollHeight;

        if (msg.message.includes('http://') == true || msg.message.includes('https://') == true) {
            let messageContents = msg.message.split(' ');
            console.log(messageContents)
            messageContents.forEach((media) => {
                
                console.log(media)
                if (media.includes('http://') == true || media.includes('https://') == true) {
                    
                    var embed = document.createElement('li')
                    embed.innerHTML =
                        '<iframe frameborder="0" scrolling="no" src="'
                        + media +
                        '" class="media" allowfullscreen></iframe>';
                    messages.appendChild(embed)
                    messages.scrollTop = messages.scrollHeight;
                }

            })
        } 

    })
})

// Alerte utilisateur déjà pris ou autres
socket.on('alertUser', function (msg) {
    alert(msg);
})

// Rafraichir la page coté serveur
socket.on('reloadPage', function () {
    location.reload();
})

// Envoi d'un message
form.addEventListener('submit', function (e) {
    e.preventDefault()
    if (input.value) {
        const msg = input.value;
        const date = new Date();
        username = localStorage.getItem('pseudo')
        socket.emit('newMessage', username, msg, date)
        input.value = ''
    }
})

sett_btn.addEventListener('click', function () {
    sett_btn.style.display = 'none';
    settings.style.display = 'block';
})

// Paramètres du
settings.addEventListener('submit', function (e) {
    e.preventDefault()
    if (user_nick.value && user_pic.value) {
        const pic = user_pic.value;
        const nick = user_nick.value;
        const remember = remember_me.checked;
        userid = localStorage.getItem('id')
        socket.emit('updateUser', userid, username, nick, pic, remember)
    }
    sett_btn.style.display = 'block';
    settings.style.display = 'none';
})

menu_btn.addEventListener('click', () => {
    let sett_bar = document.getElementById('settings-bar');
    sett_bar.style.display = 'block';
    let users_list = document.getElementById('users-side-panel');
    users_list.style.width = '100vw';
    users_list.style.position = 'absolute';
})

// Récupération des nouveaux messages
socket.on('newMessage', function (username, msg, date) {
    var item = document.createElement('li')
    var nick = document.createElement('B')
    var text = document.createElement('span')
    var time = document.createElement('I')
    nick.innerHTML = username + ' : ';
    text.innerHTML = msg;
    time.innerHTML = ' ~ ' + moment(date).startOf('second').fromNow();
    item.appendChild(nick);
    item.appendChild(text);
    item.appendChild(time);
    messages.appendChild(item)
    messages.scrollTop = messages.scrollHeight;

    if (msg.includes('http://') == true || msg.includes('https://') == true) {
            let messageContents = msg.split(' ');
            console.log(messageContents)
            messageContents.forEach((media) => {
                
                console.log(media)
                if (media.includes('http://') == true || media.includes('https://') == true) {
                    
                    var embed = document.createElement('li')
                    embed.innerHTML =
                        '<iframe frameborder="0" scrolling="no" src="'
                        + media +
                        '" class="media" allowfullscreen></iframe>';
                    messages.appendChild(embed)
                    messages.scrollTop = messages.scrollHeight;
                }

            })
        } 
})

// Récupération des nouvelles notification
socket.on('newNotification', function (msg) {
    var item = document.createElement('li')
    item.classList = 'notif'
    item.textContent = msg
    messages.appendChild(item)
    messages.scrollTop = messages.scrollHeight;
})

// Récupération de la liste des utilisateurs
socket.on('updateUsersList', function (userl) {
    // Mettre à jour la liste dans le DOM (document) => Page html
    onlineUsers.innerHTML = '';

    userl.forEach(user => {
        var p = document.createElement('p');
        var item = document.createElement('li');
        var img = document.createElement('IMG');
        img.src = user.picture;
        p.textContent = user.usrname;
        item.appendChild(img);
        item.appendChild(p);
        onlineUsers.appendChild(item);
    })

})

// Récupération des données a enregistrer
socket.on('updateSettingsData', function (userSettings) {
    // Mettre à jour la liste dans le DOM (document) => Page html

    userSettings.forEach((user) => {
        //localStorage.setItem('pseudo', user.usrname)
        user_nick.value = user.usrname;
        user_pic.value = user.picture;
        if (user.remember === true) {
            remember_me.checked = true;
        }
        if (user.remember === false) {
            remember_me.checked = false;
        }
        localStorage.setItem('id', user._id)
        localStorage.setItem('pseudo', user.usrname)
    })

})

socket.on('saveDataToLocal', function (username, uid) {
    localStorage.setItem('pseudo', username)
    localStorage.setItem('id', uid)
})

socket.on('eraseDataFromLocal', function () {
    localStorage.removeItem('pseudo');
    localStorage.removeItem('id');
})

console.log(username + ' ~ ' + uid)


socket.on('disconnect', function (userid) {

    if (remember_me.checked === true) {
        socket.emit('disconnect', userid)
    }
    if (remember_me.checked === false) {
        localStorage.clear()
    }

})