export default function roomEnterHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo) {
  console.log(data)
  let clientId = socket.id
  const {
    roomId,
    socketRoom,
    player
  } = data
  let formalPlayers = roomData[roomId].players
  roomData[roomId].players = formalPlayers.concat({ ...player, clientId }).map(p => ({ ...p, status: 0 }))
  roomData[roomId].playersCount++
  onlineUsers[clientId].currentRoom = roomId
  // roomData[roomId].playTimers += 2
  console.log(onlineUsers[clientId])

  socket.join(socketRoom, () => {
    console.log(`${player.username}进入房间${socketRoom}...`)
  })
  socket.emit('enterRoom', roomData[roomId])

  // 更新房间信息
  socket.emit('updateRoomInfo', roomData[roomId])
  // 同步外部信息
  updateAllHomeInfo()
}