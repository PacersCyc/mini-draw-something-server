import uuid from 'uuid/v4'

export default function userCreate(data, socket, onlineUsers) {
  // console.log(data)
  let clientId = socket.id
  let uid = uuid()
  onlineUsers[clientId] = {
    username: data.name,
    uid,
    clientId,
    currentRoom: ''
  }
  // onlineCount ++
  socket.emit('login', onlineUsers[clientId])
}