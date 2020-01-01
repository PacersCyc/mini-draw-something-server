export default function roomSearchHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo) {
  console.log(data)
  let clientId = socket.id
  const { roomId, player } = data

  if (roomData[roomId]) {
    // 有则直接进入房间
    let socketRoom = roomData[roomId].socketRoom

    let formalPlayers = roomData[roomId].players
    roomData[roomId].players = formalPlayers.concat({ ...player, clientId }).map(p => ({ ...p, status: 0 }))
    roomData[roomId].playersCount++
    onlineUsers[clientId].currentRoom = roomId

    socket.join(socketRoom, () => {
      console.log(`${player.username}进入房间${socketRoom}...`)
    })
    socket.emit('enterRoom', roomData[roomId])
    updateAllHomeInfo()
  } else {
    socket.emit('searchRoom', '此房间不存在')
  }
}