export default function roomChatHandle(data, socket, io) {
  const { msg, player } = data
  console.log(msg)
  console.log(socket.rooms)
  // 获取房间名
  let socketRoom = Object.keys(socket.rooms)[1]
  io.to(socketRoom).emit('chatMessage', data)
}