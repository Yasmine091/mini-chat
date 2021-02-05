moment().format();
/* moment.locale('fr'); */

const socket = io()

let username = localStorage.getItem('pseudo')
let userid = localStorage.getItem('id')
const messages = document.getElementById('messages')
const form = document.getElementById('form')
const input = document.getElementById('input')
const sett_btn = document.getElementById('settings-btn')
const settings = document.getElementById('settings-form')
const user_pic = document.getElementById('user_pic')
const user_nick = document.getElementById('user_nick')
const onlineUsers = document.getElementById('users');

// Demande du pseudo utilisateur (si pas dans le localstorage)
if(username){
    socket.emit('newUser', username)
}
else
{
while(!username) {
    username = prompt('Quel est votre pseudo')
    socket.emit('newUser', username)
}
}

/* setTimeout(function(){
    if(!userid){
        localStorage.removeItem('pseudo');
        location.reload()
    }
}, 3000); */

socket.emit('userExists', username)

socket.on('getMessages', function(chats) {
    // Mettre à jour les messages dans le DOM (document) => Page html
    
    messages.innerHTML = '';

    chats.forEach(msg => {
        var item = document.createElement('li')
        item.textContent = msg.user + 
        ': ' + msg.message + 
        ' - ' + moment(msg.date).startOf('second').fromNow();
        messages.appendChild(item)
        window.scrollTo(0, document.body.scrollHeight)
    })
})

// Envoi du nouveau user
socket.on('alertUser', function(username, msg) {
    alert(msg);
})

// Envoi d'un message
form.addEventListener('submit', function(e) {
    e.preventDefault()
    if (input.value) {
        const msg = input.value;
        const date = new Date();
        socket.emit('newMessage', username, msg, date)
        input.value = ''
    }
})

sett_btn.addEventListener('click', function() {
    sett_btn.style.display = 'none';
    settings.style.display = 'block';
})

// Paramètres du
settings.addEventListener('submit', function(e) {
    e.preventDefault()
    if (user_nick.value && user_pic.value) {
        const pic = user_pic.value;
        const nick = user_nick.value;
        socket.emit('updateUser', username, nick, pic)
    }
    sett_btn.style.display = 'block';
    settings.style.display = 'none';
})

// Récupération des nouveaux messages
socket.on('newMessage', function(username, msg, date) {
    var item = document.createElement('li')
    item.textContent = username + ': ' + msg + ' - ' + moment(date).startOf('second').fromNow();
    messages.appendChild(item)
    window.scrollTo(0, document.body.scrollHeight)
})

// Récupération des nouvelles notification
socket.on('newNotification', function(msg) {
    var item = document.createElement('li')
    item.classList = 'notif'
    item.textContent = msg
    messages.appendChild(item)
    window.scrollTo(0, document.body.scrollHeight)
})

// Récupération de la liste des utilisateurs
socket.on('updateUsersList', function(userl) {
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