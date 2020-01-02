const generateRoomId = () => {
  let d = new Date()
  return parseInt('' + d.getDate() + d.getHours() + d.getMinutes() + d.getSeconds())
}

export default function roomCreateHandle(data, socket, io, roomData, onlineUsers, count, getHomeInfo) {
  // console.log(data)
  let clientId = socket.id
  let roomId = generateRoomId()
  let socketRoom = 'room ' + (++count)
  let newRoom = {
    id: roomId,
    socketRoom,
    name: data.roomName,
    status: 0,
    type: data.roomType,
    master: { ...data.master, clientId },
    players: [{ ...data.master, clientId }].map(p => ({
      ...p,
      status: 0,  // 表示玩家在房间内状态 0:准备中 1:游戏中 
    })),
    // playTimers: 3,
    playersCount: 1
  }
  roomData[roomId] = newRoom
  onlineUsers[clientId].currentRoom = roomId
  // console.log(onlineUsers[clientId])

  socket.join(socketRoom, () => {
    console.log(`${roomData[roomId].master.username}进入房间${socketRoom}`)
  })

  io.emit('homeInfo', getHomeInfo())
  socket.emit('enterRoom', roomData[roomId])
}