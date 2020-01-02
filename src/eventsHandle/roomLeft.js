export default function roomLeftHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo) {
  // console.log(data)
  let clientId = socket.id
  const {
    roomId,
    socketRoom,
    player
  } = data
  let formalPlayers = roomData[roomId].players
  roomData[roomId].playersCount--
  // 房间没人了移除房间
  if (formalPlayers.length <= 1) {
    delete roomData[roomId]
  } else {
    roomData[roomId].players = formalPlayers.filter(item => item.uid !== player.uid)
    // 退的是房主则移交房主
    if (player.uid === roomData[roomId].master.uid) {
      roomData[roomId].master = roomData[roomId].players[0]
    }
  }
  onlineUsers[clientId].currentRoom = ''

  socket.leave(socketRoom, () => {
    console.log(`${player.username}离开了房间${socketRoom}`)
  })
  socket.emit('leftRoom', roomData[roomId])

  updateAllHomeInfo()
}