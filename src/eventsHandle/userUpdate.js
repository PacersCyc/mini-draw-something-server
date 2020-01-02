export default function userUpdate(data, socket, onlineUsers) {
  // console.log(data)
  let clientId = socket.id
  const { uid, name } = data

  if (clientId in onlineUsers) {
    onlineUsers[clientId].username = name
    socket.emit('nameUpdated', onlineUsers[clientId])
  } else {
    socket.emit('nameUpdated', {
      username: name,
      uid
    })
  }
}