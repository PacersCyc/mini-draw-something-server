export default function gameReceiveImageHandle(data, socket) {
  // console.log(data)
  // console.log(socket.rooms)
  let socketRoom = Object.keys(socket.rooms)[1]

  socket.broadcast.to(socketRoom).emit('imageData', data)
}